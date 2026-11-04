from fastapi import APIRouter, Depends, HTTPException, Body
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, func, literal_column
from sqlalchemy.exc import SQLAlchemyError
from pydantic import BaseModel, Field

from db.database import get_db
from core.dependencies import get_current_user

from models.user import User
from models.connections import Connection
from models.meetups import Meetup
from models.meetup_participants import MeetupParticipant
from models.meetup_invitations import MeetupInvitation


router = APIRouter(
    prefix="/meetups",
    tags=["Meetup Invitations"]
)


# Request schema
class InvitationCreate(BaseModel):
    invitee_id: int = Field(gt=0)


@router.post("/{meetup_id}/invitations")
def send_invitation(
    meetup_id: int,
    data: InvitationCreate = Body(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    try:
        # 1. Fetch meetup
        meetup = db.query(Meetup).filter(
            Meetup.id == meetup_id
        ).first()

        if not meetup:
            raise HTTPException(
                status_code=404,
                detail="Meetup not found"
            )

        # 2. Only host can invite
        if meetup.host_id != current_user.id:
            raise HTTPException(
                status_code=403,
                detail="Only the host can invite players"
            )

        # 3. Check meetup timing
        expected_end_time = (
            Meetup.meetup_time
            + Meetup.duration_minutes
            * literal_column("INTERVAL '1 minute'")
        )

        is_active = db.query(Meetup.id).filter(
            Meetup.id == meetup_id,
            Meetup.status.in_(["upcoming", "ongoing"]),
            expected_end_time > func.now()
        ).first()

        if not is_active:
            raise HTTPException(
                status_code=400,
                detail="This meetup is no longer accepting invitations"
            )

        # 4. Cannot invite yourself
        if data.invitee_id == current_user.id:
            raise HTTPException(
                status_code=400,
                detail="You cannot invite yourself"
            )

        # 5. Check invitee exists
        invitee = db.query(User).filter(
            User.id == data.invitee_id
        ).first()

        if not invitee:
            raise HTTPException(
                status_code=404,
                detail="Player not found"
            )

        # 6. Check accepted connection
        is_connected = db.query(Connection.id).filter(
            Connection.status == "accepted",
            or_(
                and_(
                    Connection.sender_id == current_user.id,
                    Connection.receiver_id == data.invitee_id
                ),
                and_(
                    Connection.sender_id == data.invitee_id,
                    Connection.receiver_id == current_user.id
                )
            )
        ).first() is not None

        if not is_connected:
            raise HTTPException(
                status_code=403,
                detail="You can only invite your connections"
            )

        # 7. Check existing participation
        participation = db.query(MeetupParticipant).filter(
            MeetupParticipant.meetup_id == meetup_id,
            MeetupParticipant.user_id == data.invitee_id
        ).first()

        if participation and participation.participation_status == "joined":
            raise HTTPException(
                status_code=409,
                detail="Player has already joined this meetup"
            )

        if participation and participation.participation_status == "removed":
            raise HTTPException(
                status_code=403,
                detail="This player was removed from the meetup"
            )

        # 8. Check existing invitation
        invitation = db.query(MeetupInvitation).filter(
            MeetupInvitation.meetup_id == meetup_id,
            MeetupInvitation.invited_user_id == data.invitee_id
        ).first()

        if invitation:
            if invitation.invitation_status == "pending":
                raise HTTPException(
                    status_code=409,
                    detail="Invitation is already pending"
                )

            if invitation.invitation_status == "accepted":
                raise HTTPException(
                    status_code=409,
                    detail="Invitation has already been accepted"
                )

            # Reuse declined invitation
            invitation.invitation_status = "pending"
            invitation.created_at = func.now()

        else:
            invitation = MeetupInvitation(
                meetup_id=meetup_id,
                invited_user_id=data.invitee_id,
                invitation_status="pending"
            )

            db.add(invitation)

        db.commit()

        return {
            "message": "Invitation sent successfully",
            "meetup_id": meetup_id,
            "invitee_id": data.invitee_id,
            "invitation_status": "pending"
        }

    except HTTPException:
        raise

    except SQLAlchemyError:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail="Unable to send invitation"
        )


@router.get("/invitations")
def get_received_invitations(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    try:
        Host = db.query(User).subquery()

        results = db.query(
            MeetupInvitation.id.label("invitation_id"),
            MeetupInvitation.meetup_id,
            MeetupInvitation.invitation_status,
            MeetupInvitation.created_at,

            Meetup.title,
            Meetup.sport_id,
            Meetup.visibility,
            Meetup.area,
            Meetup.landmark,
            Meetup.meetup_time,
            Meetup.duration_minutes,

            User.id.label("host_id"),
            User.first_name,
            User.last_name

        ).join(
            Meetup,
            MeetupInvitation.meetup_id == Meetup.id
        ).join(
            User,
            User.id == Meetup.host_id
        ).filter(
            MeetupInvitation.invited_user_id == current_user.id,
            MeetupInvitation.invitation_status == "pending",
            Meetup.status.in_(["upcoming", "ongoing"])
        ).order_by(
            MeetupInvitation.created_at.desc()
        ).all()

        return [
            {
                "invitation_id": row.invitation_id,
                "meetup_id": row.meetup_id,
                "invitation_status": row.invitation_status,
                "created_at": row.created_at,

                "meetup": {
                    "title": row.title,
                    "sport_id": row.sport_id,
                    "visibility": row.visibility,
                    "area": row.area,
                    "landmark": row.landmark,
                    "meetup_time": row.meetup_time,
                    "duration_minutes": row.duration_minutes
                },

                "host": {
                    "id": row.host_id,
                    "name": f"{row.first_name} {row.last_name}"
                }
            }
            for row in results
        ]

    except SQLAlchemyError:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail="Unable to fetch invitations"
        )


@router.post("/invitations/{invitation_id}/accept")
def accept_invitation(
    invitation_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    try:
        # 1. Find invitation
        invitation = db.query(MeetupInvitation).filter(
            MeetupInvitation.id == invitation_id,
            MeetupInvitation.invited_user_id == current_user.id
        ).first()

        if not invitation:
            raise HTTPException(
                status_code=404,
                detail="Invitation not found"
            )

        if invitation.invitation_status != "pending":
            raise HTTPException(
                status_code=400,
                detail="Invitation is no longer pending"
            )

        # 2. Lock meetup row
        meetup = db.query(Meetup).filter(
            Meetup.id == invitation.meetup_id
        ).with_for_update().first()

        if not meetup:
            raise HTTPException(
                status_code=404,
                detail="Meetup not found"
            )

        # 3. Check meetup timing/status
        expected_end_time = (
            Meetup.meetup_time
            + Meetup.duration_minutes
            * literal_column("INTERVAL '1 minute'")
        )

        is_active = db.query(Meetup.id).filter(
            Meetup.id == meetup.id,
            Meetup.status.in_(["upcoming", "ongoing"]),
            expected_end_time > func.now()
        ).first()

        if not is_active:
            raise HTTPException(
                status_code=400,
                detail="This meetup is no longer accepting participants"
            )

        # 4. Check existing participation
        participation = db.query(MeetupParticipant).filter(
            MeetupParticipant.meetup_id == meetup.id,
            MeetupParticipant.user_id == current_user.id
        ).first()

        if participation and participation.participation_status == "joined":
            raise HTTPException(
                status_code=409,
                detail="You have already joined this meetup"
            )

        if participation and participation.participation_status == "removed":
            raise HTTPException(
                status_code=403,
                detail="You cannot join this meetup"
            )

        # 5. Check capacity
        participant_count = db.query(
            func.count(MeetupParticipant.id)
        ).filter(
            MeetupParticipant.meetup_id == meetup.id,
            MeetupParticipant.participation_status == "joined"
        ).scalar()

        if participant_count >= meetup.max_participants:
            raise HTTPException(
                status_code=409,
                detail="This meetup is full"
            )

        # 6. Join meetup
        if participation:
            participation.participation_status = "joined"
            participation.joined_at = func.now()
            participation.outcome_confirmation = None

        else:
            participation = MeetupParticipant(
                meetup_id=meetup.id,
                user_id=current_user.id,
                participation_status="joined"
            )
            db.add(participation)

        # 7. Accept invitation
        invitation.invitation_status = "accepted"

        db.commit()

        return {
            "message": "Invitation accepted successfully",
            "meetup_id": meetup.id,
            "invitation_status": "accepted",
            "participation_status": "joined",
            "participant_count": participant_count + 1,
            "max_participants": meetup.max_participants
        }

    except HTTPException:
        raise

    except SQLAlchemyError:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail="Unable to accept invitation"
        )


@router.post("/invitations/{invitation_id}/decline")
def decline_invitation(
    invitation_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    try:
        invitation = db.query(MeetupInvitation).filter(
            MeetupInvitation.id == invitation_id,
            MeetupInvitation.invited_user_id == current_user.id
        ).first()

        if not invitation:
            raise HTTPException(
                status_code=404,
                detail="Invitation not found"
            )

        if invitation.invitation_status != "pending":
            raise HTTPException(
                status_code=400,
                detail="Invitation is no longer pending"
            )

        invitation.invitation_status = "declined"

        db.commit()

        return {
            "message": "Invitation declined",
            "invitation_id": invitation.id,
            "invitation_status": "declined"
        }

    except HTTPException:
        raise

    except SQLAlchemyError:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail="Unable to decline invitation"
        )


