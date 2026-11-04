from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, or_

from db.database import get_db
from core.dependencies import get_current_user

from models.user import User
from models.meetups import Meetup
from models.meetup_participants import MeetupParticipant
from models.sports import Sport


router = APIRouter(
    prefix="/meetups",
    tags=["Meetup History"]
)


@router.get("/history")
def get_meetup_history(
    filter: str = Query(
        default="all",
        pattern="^(all|hosted|joined)$"
    ),
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=20, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(
        Meetup,
        Sport.name.label("sport_name"),
        User.first_name.label("host_first_name"),
        User.last_name.label("host_last_name")
    ).join(
        Sport,
        Meetup.sport_id == Sport.id
    ).join(
        User,
        Meetup.host_id == User.id
    ).outerjoin(
        MeetupParticipant,
        MeetupParticipant.meetup_id == Meetup.id
    ).filter(
        or_(
            Meetup.host_id == current_user.id,
            MeetupParticipant.user_id == current_user.id
        ),
        Meetup.status.in_([
            "completed_success",
            "completed_failed",
            "disputed",
            "cancelled"
        ])
    )

    if filter == "hosted":
        query = query.filter(
            Meetup.host_id == current_user.id
        )

    elif filter == "joined":
        query = query.filter(
            MeetupParticipant.user_id == current_user.id,
            Meetup.host_id != current_user.id
        )

    query = query.distinct()

    total = query.count()

    results = query.order_by(
        Meetup.meetup_time.desc(),
        Meetup.id.desc()
    ).offset(skip).limit(limit).all()

    meetup_ids = [
        meetup.id
        for meetup, _, _, _ in results
    ]

    participant_counts = {}

    if meetup_ids:
        count_rows = db.query(
            MeetupParticipant.meetup_id,
            func.count(MeetupParticipant.id).label("participant_count")
        ).filter(
            MeetupParticipant.meetup_id.in_(meetup_ids),
            MeetupParticipant.participation_status == "joined"
        ).group_by(
            MeetupParticipant.meetup_id
        ).all()

        participant_counts = {
            meetup_id: count
            for meetup_id, count in count_rows
        }

    meetups = []

    for meetup, sport_name, host_first_name, host_last_name in results:
        participant = db.query(
            MeetupParticipant
        ).filter(
            MeetupParticipant.meetup_id == meetup.id,
            MeetupParticipant.user_id == current_user.id
        ).first()

        meetups.append({
            "id": meetup.id,
            "title": meetup.title,
            "sport_name": sport_name,
            "host_id": meetup.host_id,
            "host_name": f"{host_first_name} {host_last_name}",
            "meetup_time": meetup.meetup_time,
            "duration_minutes": meetup.duration_minutes,
            "area": meetup.area,
            "landmark": meetup.landmark,
            "participant_count": participant_counts.get(
                meetup.id, 0
            ),
            "max_participants": meetup.max_participants,
            "status": meetup.status,
            "user_role": (
                "host"
                if meetup.host_id == current_user.id
                else "participant"
            ),
            "my_participation_status": (
                participant.participation_status
                if participant
                else None
            ),
            "my_outcome_confirmation": (
                participant.outcome_confirmation
                if participant
                else None
            )
        })

    return {
        "meetups": meetups,
        "total": total,
        "skip": skip,
        "limit": limit
    }