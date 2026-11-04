from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Body
from sqlalchemy.orm import Session
from sqlalchemy import func, literal_column
from sqlalchemy.exc import SQLAlchemyError
from pydantic import BaseModel, Field

from db.database import get_db
from core.dependencies import get_current_user

from models.user import User
from models.meetups import Meetup
from models.meetup_participants import MeetupParticipant
from models.meetup_invitations import MeetupInvitation


router = APIRouter(
    prefix="/meetups",
    tags=["Meetup Management"]
)


@router.delete("/{meetup_id}/participants/{user_id}")
def remove_participant(
    meetup_id: int,
    user_id: int,
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

        # 2. Verify host
        if meetup.host_id != current_user.id:
            raise HTTPException(
                status_code=403,
                detail="Only the host can remove participants"
            )

        # 3. Prevent removing host
        if user_id == meetup.host_id:
            raise HTTPException(
                status_code=400,
                detail="Host cannot be removed"
            )

        # 4. Verify meetup is still active
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
                detail="Cannot remove participants from an inactive meetup"
            )

        # 5. Find participant
        participation = db.query(MeetupParticipant).filter(
            MeetupParticipant.meetup_id == meetup_id,
            MeetupParticipant.user_id == user_id
        ).first()

        if not participation:
            raise HTTPException(
                status_code=404,
                detail="Participant not found"
            )

        if participation.participation_status != "joined":
            raise HTTPException(
                status_code=400,
                detail="Player is not currently participating"
            )

        # 6. Remove participant
        participation.participation_status = "removed"

        db.commit()

        return {
            "message": "Participant removed successfully",
            "meetup_id": meetup_id,
            "user_id": user_id,
            "participation_status": "removed"
        }

    except HTTPException:
        raise

    except SQLAlchemyError:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail="Unable to remove participant"
        )


class MeetupUpdate(BaseModel):
    meetup_time: datetime
    duration_minutes: int = Field(ge=15, le=720)


@router.patch("/{meetup_id}")
def update_meetup(
    meetup_id: int,
    data: MeetupUpdate = Body(...),
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

        # 2. Verify host
        if meetup.host_id != current_user.id:
            raise HTTPException(
                status_code=403,
                detail="Only the host can update this meetup"
            )

        # 3. Check meetup status
        if meetup.status not in ["upcoming", "ongoing"]:
            raise HTTPException(
                status_code=400,
                detail="This meetup cannot be updated"
            )

        # 4. Check whether the existing meetup has ended
        existing_end_time = (
            Meetup.meetup_time
            + Meetup.duration_minutes
            * literal_column("INTERVAL '1 minute'")
        )

        has_ended = db.query(Meetup.id).filter(
            Meetup.id == meetup_id,
            existing_end_time <= func.now()
        ).first()

        if has_ended:
            raise HTTPException(
                status_code=400,
                detail="An ended meetup cannot be updated"
            )

        # 5. Validate new meetup time
        if data.meetup_time.tzinfo is not None:
            new_meetup_time = data.meetup_time
        else:
            # Naive datetimes are interpreted as UTC here.
            new_meetup_time = data.meetup_time.replace(
                tzinfo=__import__("datetime").timezone.utc
            )

        if new_meetup_time <= datetime.now(
            new_meetup_time.tzinfo
        ):
            raise HTTPException(
                status_code=400,
                detail="Meetup time must be in the future"
            )

        # 6. Update
        meetup.meetup_time = new_meetup_time
        meetup.duration_minutes = data.duration_minutes

        db.commit()
        db.refresh(meetup)

        return {
            "message": "Meetup updated successfully",
            "meetup_id": meetup.id,
            "meetup_time": meetup.meetup_time,
            "duration_minutes": meetup.duration_minutes
        }

    except HTTPException:
        raise

    except SQLAlchemyError:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail="Unable to update meetup"
        )


@router.delete("/{meetup_id}")
def delete_meetup(
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

        # 2. Verify host
        if meetup.host_id != current_user.id:
            raise HTTPException(
                status_code=403,
                detail="Only the host can delete this meetup"
            )

        # 3. Check meetup status
        if meetup.status not in ["upcoming", "ongoing"]:
            raise HTTPException(
                status_code=400,
                detail="This meetup cannot be deleted"
            )

        # 4. Check whether meetup has ended
        expected_end_time = (
            Meetup.meetup_time
            + Meetup.duration_minutes
            * literal_column("INTERVAL '1 minute'")
        )

        has_ended = db.query(Meetup.id).filter(
            Meetup.id == meetup_id,
            expected_end_time <= func.now()
        ).first()

        if has_ended:
            raise HTTPException(
                status_code=400,
                detail="An ended meetup cannot be deleted"
            )

        # 5. Delete dependent records
        db.query(MeetupParticipant).filter(
            MeetupParticipant.meetup_id == meetup_id
        ).delete(synchronize_session=False)

        db.query(MeetupInvitation).filter(
            MeetupInvitation.meetup_id == meetup_id
        ).delete(synchronize_session=False)

        # 6. Delete meetup
        db.delete(meetup)

        db.commit()

        return {
            "message": "Meetup deleted successfully",
            "meetup_id": meetup_id
        }

    except HTTPException:
        raise

    except SQLAlchemyError:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail="Unable to delete meetup"
        )


