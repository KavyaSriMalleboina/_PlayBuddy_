from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Query, Body
from sqlalchemy import and_, or_, func, case, literal_column
from sqlalchemy.orm import Session, aliased
from sqlalchemy.exc import SQLAlchemyError

from db.database import get_db
from core.dependencies import get_current_user
from models.user import User
from models.connections import Connection
from models.sports import Sport
from models.meetups import Meetup
from models.meetup_participants import MeetupParticipant
from models.meetup_invitations import MeetupInvitation

from schemas.meetups import MeetupCreate
from services.meetup_lifecycle import reconcile_meetup

router = APIRouter(
    prefix="/meetups",
    tags=["Meetups"]
)

# ============================================================
# GET /meetups
# ============================================================
@router.get("")
def get_meetups(
    search: str | None = Query(default=None, max_length=150),
    sport_id: int | None = Query(default=None, gt=0),
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=20, ge=1, le=50),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    try:
        # ----------------------------------------------------
        # 1. Get the current user's accepted connections
        # ----------------------------------------------------
        connected_user_ids = db.query(
            case(
                (Connection.sender_id == current_user.id, Connection.receiver_id),
                else_=Connection.sender_id
            )
        ).filter(
            Connection.status == "accepted",
            or_(
                Connection.sender_id == current_user.id,
                Connection.receiver_id == current_user.id
            )
        )

        # ----------------------------------------------------
        # 2. Get active invitations for the current user
        # ----------------------------------------------------
        invitation_meetup_ids = db.query(
            MeetupInvitation.meetup_id
        ).filter(
            MeetupInvitation.invited_user_id == current_user.id,
            MeetupInvitation.invitation_status.in_(["pending", "accepted"])
        )

        # ----------------------------------------------------
        # 3. Calculate participant counts
        # ----------------------------------------------------
        participant_counts = db.query(
            MeetupParticipant.meetup_id.label("meetup_id"),
            func.count(MeetupParticipant.id).label("participant_count")
        ).filter(
            MeetupParticipant.participation_status == "joined"
        ).group_by(
            MeetupParticipant.meetup_id
        ).subquery()

        # ----------------------------------------------------
        # 4. Host alias
        # ----------------------------------------------------
        Host = aliased(User)

        # ----------------------------------------------------
        # 5. Base query
        # ----------------------------------------------------
        query = db.query(
            Meetup.id.label("id"),
            Meetup.title.label("title"),
            Meetup.host_id.label("host_id"),
            Host.first_name.label("host_first_name"),
            Host.last_name.label("host_last_name"),
            Meetup.sport_id.label("sport_id"),
            Sport.name.label("sport_name"),
            Meetup.visibility.label("visibility"),
            Meetup.area.label("area"),
            Meetup.landmark.label("landmark"),
            Meetup.meetup_time.label("meetup_time"),
            Meetup.duration_minutes.label("duration_minutes"),
            Meetup.max_participants.label("max_participants"),
            func.coalesce(participant_counts.c.participant_count, 0).label("participant_count"),
            Meetup.status.label("status")
        ).join(
            Host, Meetup.host_id == Host.id
        ).join(
            Sport, Meetup.sport_id == Sport.id
        ).outerjoin(
            participant_counts, Meetup.id == participant_counts.c.meetup_id
        )

        # ----------------------------------------------------
        # 6. Visibility rules
        # ----------------------------------------------------
        visibility_filter = or_(
            Meetup.host_id == current_user.id,
            and_(
                Meetup.visibility == "public",
                Meetup.host_id.in_(connected_user_ids)
            ),
            Meetup.id.in_(invitation_meetup_ids)
        )
        query = query.filter(visibility_filter)

        # ----------------------------------------------------
        # 7. Active meetup filtering
        # ----------------------------------------------------
        expected_end_time = (
            Meetup.meetup_time
            + (
                Meetup.duration_minutes
                * literal_column("INTERVAL '1 minute'")
            )
        )

        query = query.filter(
            Meetup.status.in_(["upcoming", "ongoing"]),
            expected_end_time > func.now()
        )

        # ----------------------------------------------------
        # 8. Search by meetup title
        # ----------------------------------------------------
        if search and search.strip():
            search_term = (
                search.strip()
                .replace("\\", "\\\\")
                .replace("%", "\\%")
                .replace("_", "\\_")
            )
            query = query.filter(
                Meetup.title.ilike(f"%{search_term}%", escape="\\")
            )

        # ----------------------------------------------------
        # 9. Filter by sport
        # ----------------------------------------------------
        if sport_id is not None:
            query = query.filter(Meetup.sport_id == sport_id)

        # ----------------------------------------------------
        # 10. Order by meetup start time
        # ----------------------------------------------------
        query = query.order_by(
            Meetup.meetup_time.asc(),
            Meetup.id.asc()
        )

        # ----------------------------------------------------
        # 11. Pagination
        # ----------------------------------------------------
        results = query.offset(skip).limit(limit).all()

        # ----------------------------------------------------
        # 12. Response
        # ----------------------------------------------------
        return [
            {
                "id": row.id,
                "title": row.title,
                "host_id": row.host_id,
                "host_name": f"{row.host_first_name} {row.host_last_name}",
                "sport_id": row.sport_id,
                "sport_name": row.sport_name,
                "visibility": row.visibility,
                "area": row.area,
                "landmark": row.landmark,
                "meetup_time": row.meetup_time,
                "duration_minutes": row.duration_minutes,
                "max_participants": row.max_participants,
                "participant_count": row.participant_count,
                "status": row.status
            }
            for row in results
        ]

    except SQLAlchemyError:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail="Unable to fetch meetups"
        )


@router.get("/{meetup_id}")
def get_meetup_details(
    meetup_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    try:
        meetup = db.query(Meetup).filter(
            Meetup.id == meetup_id
        ).first()

        if not meetup:
            raise HTTPException(
                status_code=404,
                detail="Meetup not found"
            )

        # 1. Check whether current user is the host
        is_host = meetup.host_id == current_user.id

        # 2. Check whether host is an accepted connection
        is_connected = False

        if not is_host:
            is_connected = db.query(Connection.id).filter(
                Connection.status == "accepted",
                or_(
                    and_(
                        Connection.sender_id == current_user.id,
                        Connection.receiver_id == meetup.host_id
                    ),
                    and_(
                        Connection.sender_id == meetup.host_id,
                        Connection.receiver_id == current_user.id
                    )
                )
            ).first() is not None

        # 3. Check invitation status
        invitation = db.query(MeetupInvitation).filter(
            MeetupInvitation.meetup_id == meetup_id,
            MeetupInvitation.invited_user_id == current_user.id
        ).first()

        invitation_status = (
            invitation.invitation_status
            if invitation else None
        )

        is_invited = invitation_status in ["pending", "accepted"]

        # 4. Check existing participation
        participation = db.query(MeetupParticipant).filter(
            MeetupParticipant.meetup_id == meetup_id,
            MeetupParticipant.user_id == current_user.id
        ).first()

        is_participant = (
            participation is not None
            and participation.participation_status == "joined"
        )

        # 5. Authorization
        can_view = (
            is_host
            or is_participant
            or is_invited
            or (
                meetup.visibility == "public"
                and is_connected
            )
        )

        if not can_view:
            raise HTTPException(
                status_code=404,
                detail="Meetup not found"
            )

        # 6. Fetch host details
        host = db.query(User).filter(
            User.id == meetup.host_id
        ).first()

        # 7. Fetch sport details
        sport = db.query(Sport).filter(
            Sport.id == meetup.sport_id
        ).first()

        # 8. Fetch joined participants
        participants = db.query(
            MeetupParticipant.user_id,
            User.first_name,
            User.last_name,
            MeetupParticipant.joined_at
        ).join(
            User,
            User.id == MeetupParticipant.user_id
        ).filter(
            MeetupParticipant.meetup_id == meetup_id,
            MeetupParticipant.participation_status == "joined"
        ).order_by(
            MeetupParticipant.joined_at.asc()
        ).all()

        participant_count = len(participants)

        reconcile_meetup(
            db,
            meetup
        )

        db.commit()
        db.refresh(meetup)

        return {
            "id": meetup.id,
            "title": meetup.title,
            "description": meetup.description,

            "host": {
                "id": host.id,
                "name": f"{host.first_name} {host.last_name}"
            },

            "sport": {
                "id": sport.id,
                "name": sport.name
            },

            "visibility": meetup.visibility,
            "area": meetup.area,
            "landmark": meetup.landmark,

            "meetup_time": meetup.meetup_time,
            "duration_minutes": meetup.duration_minutes,

            "max_participants": meetup.max_participants,
            "participant_count": participant_count,

            "status": meetup.status,

            "is_host": is_host,
            "is_participant": is_participant,
            "my_participation_status": (
                participation.participation_status
                if participation else None
            ),

            "invitation_status": invitation_status,

            "participants": [
                {
                    "user_id": p.user_id,
                    "name": f"{p.first_name} {p.last_name}",
                    "joined_at": p.joined_at
                }
                for p in participants
            ]
        }

    except HTTPException:
        raise

    except SQLAlchemyError:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail="Unable to fetch meetup details"
        )


@router.post("", status_code=201)
def create_meetup(
    data: MeetupCreate = Body(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    try:
        # 1. Verify sport exists
        sport = db.query(Sport).filter(
            Sport.id == data.sport_id
        ).first()

        if not sport:
            raise HTTPException(
                status_code=404,
                detail="Sport not found"
            )

        # 2. Create meetup
        meetup = Meetup(
            host_id=current_user.id,
            title=data.title,
            description=data.description,
            sport_id=data.sport_id,
            max_participants=data.max_participants,
            visibility=data.visibility,
            area=data.area,
            landmark=data.landmark,
            meetup_time=data.meetup_time,
            duration_minutes=data.duration_minutes,
            status="upcoming"
        )

        db.add(meetup)

        # Generate meetup.id before creating participant
        db.flush()

        # 3. Automatically register host
        host_participation = MeetupParticipant(
            meetup_id=meetup.id,
            user_id=current_user.id,
            participation_status="joined"
        )

        db.add(host_participation)

        # 4. Save both records together
        db.commit()
        db.refresh(meetup)

        return {
            "message": "Meetup created successfully",
            "meetup_id": meetup.id,
            "title": meetup.title,
            "host_id": meetup.host_id,
            "sport_id": meetup.sport_id,
            "visibility": meetup.visibility,
            "meetup_time": meetup.meetup_time,
            "duration_minutes": meetup.duration_minutes,
            "max_participants": meetup.max_participants,
            "status": meetup.status
        }

    except HTTPException:
        raise

    except SQLAlchemyError:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail="Unable to create meetup"
        )


@router.post("/{meetup_id}/join")
def join_meetup(
    meetup_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    try:
        # 1. Fetch and lock meetup
        meetup = db.query(Meetup).filter(
            Meetup.id == meetup_id
        ).with_for_update().first()

        if not meetup:
            raise HTTPException(
                status_code=404,
                detail="Meetup not found"
            )

        # 2. Host cannot join again
        if meetup.host_id == current_user.id:
            raise HTTPException(
                status_code=400,
                detail="You are already the host"
            )

        # 3. Only upcoming meetups accept participants

        is_joinable = db.query(Meetup.id).filter(
            Meetup.id == meetup_id,
            Meetup.status == "upcoming",
            Meetup.meetup_time > func.now()
        ).first()

        if not is_joinable:
            raise HTTPException(
                status_code=400,
                detail="This meetup has already started or is no longer accepting participants"
            )

        # 4. Check invitation
        invitation = db.query(MeetupInvitation).filter(
            MeetupInvitation.meetup_id == meetup_id,
            MeetupInvitation.invited_user_id == current_user.id
        ).first()

        invitation_status = (
            invitation.invitation_status
            if invitation else None
        )

        # 5. Check connection with host
        is_connected = db.query(Connection.id).filter(
            Connection.status == "accepted",
            or_(
                and_(
                    Connection.sender_id == current_user.id,
                    Connection.receiver_id == meetup.host_id
                ),
                and_(
                    Connection.sender_id == meetup.host_id,
                    Connection.receiver_id == current_user.id
                )
            )
        ).first() is not None

        # 6. Authorization
        if meetup.visibility == "public":
            if not is_connected:
                raise HTTPException(
                    status_code=403,
                    detail="You must be connected to the host to join"
                )

        elif meetup.visibility == "private":
            if invitation_status != "accepted":
                raise HTTPException(
                    status_code=403,
                    detail="You need an accepted invitation to join"
                )

        else:
            raise HTTPException(
                status_code=400,
                detail="Invalid meetup visibility"
            )

        # 7. Check existing participation
        participation = db.query(MeetupParticipant).filter(
            MeetupParticipant.meetup_id == meetup_id,
            MeetupParticipant.user_id == current_user.id
        ).first()

        if participation:
            if participation.participation_status == "joined":
                raise HTTPException(
                    status_code=409,
                    detail="You have already joined this meetup"
                )

            if participation.participation_status == "removed":
                raise HTTPException(
                    status_code=403,
                    detail="You cannot rejoin this meetup"
                )

        # 8. Check capacity
        participant_count = db.query(
            func.count(MeetupParticipant.id)
        ).filter(
            MeetupParticipant.meetup_id == meetup_id,
            MeetupParticipant.participation_status == "joined"
        ).scalar()

        if participant_count >= meetup.max_participants:
            raise HTTPException(
                status_code=409,
                detail="This meetup is full"
            )

        # 9. Create or reactivate participation
        if participation:
            participation.participation_status = "joined"
            participation.joined_at = func.now()
            participation.outcome_confirmation = None

        else:
            participation = MeetupParticipant(
                meetup_id=meetup_id,
                user_id=current_user.id,
                participation_status="joined"
            )

            db.add(participation)

        db.commit()

        return {
            "message": "Successfully joined meetup",
            "meetup_id": meetup_id,
            "participant_count": participant_count + 1,
            "max_participants": meetup.max_participants,
            "participation_status": "joined"
        }

    except HTTPException:
        raise

    except SQLAlchemyError:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail="Unable to join meetup"
        )


@router.delete("/{meetup_id}/join")
def leave_meetup(
    meetup_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    try:
        # 1. Fetch meetup and lock its row
        meetup = db.query(Meetup).filter(
            Meetup.id == meetup_id
        ).with_for_update().first()

        if not meetup:
            raise HTTPException(
                status_code=404,
                detail="Meetup not found"
            )

        # 2. Host cannot leave using this endpoint
        if meetup.host_id == current_user.id:
            raise HTTPException(
                status_code=400,
                detail="Host cannot leave their own meetup"
            )

        # 3. Participants cannot leave after the meetup starts

        is_leave_allowed = db.query(Meetup.id).filter(
            Meetup.id == meetup_id,
            Meetup.status == "upcoming",
            Meetup.meetup_time > func.now()
        ).first()

        if not is_leave_allowed:
            raise HTTPException(
                status_code=400,
                detail="You cannot leave a meetup after it has started"
            )

        # 4. Find participant record
        participation = db.query(MeetupParticipant).filter(
            MeetupParticipant.meetup_id == meetup_id,
            MeetupParticipant.user_id == current_user.id
        ).first()

        if not participation:
            raise HTTPException(
                status_code=404,
                detail="You are not a participant of this meetup"
            )

        # 5. Check participation status
        if participation.participation_status != "joined":
            raise HTTPException(
                status_code=400,
                detail="You are not currently participating in this meetup"
            )

        # 6. Mark participant as left
        participation.participation_status = "left"

        db.commit()

        # 7. Fetch updated count
        participant_count = db.query(
            func.count(MeetupParticipant.id)
        ).filter(
            MeetupParticipant.meetup_id == meetup_id,
            MeetupParticipant.participation_status == "joined"
        ).scalar()

        return {
            "message": "Successfully left meetup",
            "meetup_id": meetup_id,
            "participation_status": "left",
            "participant_count": participant_count,
            "max_participants": meetup.max_participants
        }

    except HTTPException:
        raise

    except SQLAlchemyError:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail="Unable to leave meetup"
        )


