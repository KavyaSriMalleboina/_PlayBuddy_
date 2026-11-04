from datetime import datetime, timedelta, timezone

from sqlalchemy.orm import Session
from sqlalchemy import func

from models.meetups import Meetup
from models.meetup_participants import MeetupParticipant
from models.user import User


CONFIRMATION_WINDOW_HOURS = 24


def utc_now():
    return datetime.now(timezone.utc)


def get_meetup_end_time(meetup: Meetup):
    meetup_time = meetup.meetup_time

    if meetup_time.tzinfo is None:
        meetup_time = meetup_time.replace(
            tzinfo=timezone.utc
        )

    return meetup_time + timedelta(
        minutes=meetup.duration_minutes
    )


def finalize_meetup(
    db: Session,
    meetup: Meetup
):
    """
    Finalize an awaiting-confirmation meetup.

    Missing votes are ignored.
    Ties and insufficient confirmations become disputed.
    """

    if meetup.status != "awaiting_confirmation":
        return False

    if meetup.finalized_at is not None:
        return False

    now = utc_now()

    if (
        meetup.confirmation_deadline is not None
        and meetup.confirmation_deadline > now
    ):
        return False

    participants = db.query(
        MeetupParticipant
    ).filter(
        MeetupParticipant.meetup_id == meetup.id,
        MeetupParticipant.participation_status == "joined"
    ).all()

    success_votes = sum(
        p.outcome_confirmation == "success"
        for p in participants
    )

    failure_votes = sum(
        p.outcome_confirmation == "failure"
        for p in participants
    )

    total_votes = success_votes + failure_votes

    # Require a strict majority of eligible participants
    eligible_count = len(participants)

    # Minimum 50% participation, rounded up
    quorum = max(
        1,
        (eligible_count + 1) // 2
    )

    if total_votes < quorum:
        meetup.status = "disputed"

    elif success_votes > failure_votes:
        meetup.status = "completed_success"

    elif failure_votes > success_votes:
        meetup.status = "completed_failed"

    else:
        meetup.status = "disputed"

    meetup.finalized_at = now

    if meetup.status == "completed_success":
        db.query(User).filter(
            User.id == meetup.host_id
        ).update(
            {
                User.meetup_count:
                    User.meetup_count + 1
            },
            synchronize_session=False
        )

    db.flush()

    return True


def reconcile_meetup(
    db: Session,
    meetup: Meetup
):
    """
    Update a meetup's lifecycle based on current time.

    This is an on-demand reconciliation function.
    """

    now = utc_now()

    if meetup.status not in [
        "upcoming",
        "ongoing",
        "awaiting_confirmation"
    ]:
        return

    end_time = get_meetup_end_time(meetup)

    # Start meetup
    if (
        meetup.status == "upcoming"
        and meetup.meetup_time <= now
    ):
        meetup.status = "ongoing"

    # Start confirmation phase
    if (
        meetup.status in ["upcoming", "ongoing"]
        and end_time <= now
    ):
        meetup.status = "awaiting_confirmation"

        meetup.confirmation_deadline = (
            end_time
            + timedelta(
                hours=CONFIRMATION_WINDOW_HOURS
            )
        )

    # Finalize if deadline passed
    if (
        meetup.status == "awaiting_confirmation"
        and meetup.confirmation_deadline is not None
        and meetup.confirmation_deadline <= now
    ):
        finalize_meetup(
            db,
            meetup
        )

    db.flush()