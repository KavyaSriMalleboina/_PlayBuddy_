from typing import Literal

from fastapi import (
    APIRouter,
    Depends,
    HTTPException
)

from pydantic import BaseModel

from sqlalchemy.orm import Session

from db.database import get_db
from core.dependencies import get_current_user

from models.user import User
from models.meetups import Meetup
from models.meetup_participants import MeetupParticipant
from models.sports import Sport

from sqlalchemy import func
from datetime import timedelta

from services.meetup_lifecycle import (
    reconcile_meetup,
    utc_now,
    get_meetup_end_time,
    CONFIRMATION_WINDOW_HOURS
)




router = APIRouter(
    prefix="/meetups",
    tags=["Meetup Outcomes"]
)


class OutcomeRequest(BaseModel):
    outcome: Literal["success", "failure"]


@router.post("/{meetup_id}/outcome")
def submit_outcome(
    meetup_id: int,
    data: OutcomeRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    try:
        meetup = db.query(Meetup).filter(
            Meetup.id == meetup_id
        ).with_for_update().first()

        if not meetup:
            raise HTTPException(
                status_code=404,
                detail="Meetup not found"
            )

        reconcile_meetup(
            db,
            meetup
        )

        if meetup.status != "awaiting_confirmation":
            raise HTTPException(
                status_code=400,
                detail="Meetup is not accepting confirmations"
            )

        if (
            meetup.confirmation_deadline is not None
            and meetup.confirmation_deadline <= utc_now()
        ):
            raise HTTPException(
                status_code=400,
                detail="Confirmation deadline has passed"
            )

        participant = db.query(
            MeetupParticipant
        ).filter(
            MeetupParticipant.meetup_id == meetup_id,
            MeetupParticipant.user_id == current_user.id
        ).with_for_update().first()

        if not participant:
            raise HTTPException(
                status_code=403,
                detail="You are not a participant"
            )

        if participant.participation_status != "joined":
            raise HTTPException(
                status_code=403,
                detail="Only active participants can confirm"
            )

        participant.outcome_confirmation = data.outcome

        # Check whether everyone eligible has submitted.
        eligible_count = db.query(
            MeetupParticipant
        ).filter(
            MeetupParticipant.meetup_id == meetup_id,
            MeetupParticipant.participation_status == "joined"
        ).count()

        submitted_count = db.query(
            MeetupParticipant
        ).filter(
            MeetupParticipant.meetup_id == meetup_id,
            MeetupParticipant.participation_status == "joined",
            MeetupParticipant.outcome_confirmation.isnot(None)
        ).count()

        finalized_early = False

        if (
            eligible_count > 0
            and submitted_count == eligible_count
        ):
            # All eligible participants have voted.
            # Allow finalization before the deadline.
            meetup.confirmation_deadline = utc_now()

            from services.meetup_lifecycle import finalize_meetup

            finalized_early = finalize_meetup(
                db,
                meetup
            )

        db.commit()

        return {
            "message": "Outcome confirmation saved",
            "meetup_id": meetup_id,
            "outcome": data.outcome,
            "finalized": finalized_early,
            "status": meetup.status
        }

    except HTTPException:
        db.rollback()
        raise

    except Exception:
        db.rollback()
        raise


@router.get("/pending-confirmation")
def get_pending_confirmations(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    now = utc_now()

    # Find meetups where the current user was an
    # active participant.
    meetups = db.query(
        Meetup
    ).join(
        MeetupParticipant,
        MeetupParticipant.meetup_id == Meetup.id
    ).filter(
        MeetupParticipant.user_id == current_user.id,
        MeetupParticipant.participation_status == "joined",
        Meetup.status.in_([
            "upcoming",
            "ongoing",
            "awaiting_confirmation"
        ])
    ).all()

    # Reconcile each meetup so expired meetups don't
    # remain stuck in an earlier lifecycle state.
    for meetup in meetups:
        reconcile_meetup(db, meetup)

    db.commit()

    # Return only meetups that still require
    # confirmation.
    pending = []

    for meetup in meetups:
        if meetup.status != "awaiting_confirmation":
            continue

        participant = db.query(
            MeetupParticipant
        ).filter(
            MeetupParticipant.meetup_id == meetup.id,
            MeetupParticipant.user_id == current_user.id
        ).first()

        if not participant:
            continue

        if participant.participation_status != "joined":
            continue

        sport = db.query(Sport).filter(
            Sport.id == meetup.sport_id
        ).first()

        participant_count = db.query(
            func.count(MeetupParticipant.id)
        ).filter(
            MeetupParticipant.meetup_id == meetup.id,
            MeetupParticipant.participation_status == "joined"
        ).scalar()

        submitted_count = db.query(
            func.count(MeetupParticipant.id)
        ).filter(
            MeetupParticipant.meetup_id == meetup.id,
            MeetupParticipant.participation_status == "joined",
            MeetupParticipant.outcome_confirmation.isnot(None)
        ).scalar()

        pending.append({
            "id": meetup.id,
            "title": meetup.title,
            "sport_name": sport.name if sport else None,
            "meetup_time": meetup.meetup_time,
            "duration_minutes": meetup.duration_minutes,
            "area": meetup.area,
            "landmark": meetup.landmark,
            "host_id": meetup.host_id,
            "eligible_participants": participant_count,
            "submitted_confirmations": submitted_count,
            "my_confirmation": participant.outcome_confirmation,
            "confirmation_deadline": meetup.confirmation_deadline
        })

    return {
        "meetups": pending,
        "count": len(pending)
    }


