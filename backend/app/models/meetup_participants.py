from datetime import datetime

from sqlalchemy import (
    Integer,
    String,
    DateTime,
    ForeignKey,
    CheckConstraint,
    UniqueConstraint
)

from sqlalchemy.orm import Mapped, mapped_column

from db.base import Base


class MeetupParticipant(Base):

    __tablename__ = "meetup_participants"

    __table_args__ = (

        UniqueConstraint(
            "meetup_id",
            "user_id",
            name="unique_meetup_participant"
        ),

        CheckConstraint(
            """
            participation_status IN (
                'joined',
                'left',
                'removed'
            )
            """,
            name="check_participation_status"
        ),

        CheckConstraint(
            """
            outcome_confirmation IN (
                'success',
                'failure'
            )
            OR outcome_confirmation IS NULL
            """,
            name="check_outcome_confirmation"
        )
    )

    id: Mapped[int] = mapped_column(
        Integer,
        primary_key=True
    )

    meetup_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("meetups.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )

    user_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )

    joined_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now().astimezone()
    )

    participation_status: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
        default="joined"
    )

    outcome_confirmation: Mapped[str | None] = mapped_column(
        String(10),
        nullable=True
    )