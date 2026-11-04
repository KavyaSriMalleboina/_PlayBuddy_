from datetime import datetime

from sqlalchemy import (
    Integer,
    String,
    Text,
    DateTime,
    ForeignKey,
    CheckConstraint,
    UniqueConstraint
)

from sqlalchemy.orm import Mapped, mapped_column

from db.base import Base


class Meetup(Base):

    __tablename__ = "meetups"

    __table_args__ = (

        CheckConstraint(
            "max_participants >= 2",
            name="check_meetup_capacity"
        ),

        CheckConstraint(
            "duration_minutes > 0",
            name="check_meetup_duration"
        ),

        CheckConstraint(
            "visibility IN ('public', 'private')",
            name="check_meetup_visibility"
        ),

        CheckConstraint(
            """
            status IN (
                'upcoming',
                'ongoing',
                'awaiting_confirmation',
                'completed_success',
                'completed_failed',
                'disputed',
                'cancelled'
            )
            """,
            name="check_meetup_status"
        )
    )

    id: Mapped[int] = mapped_column(
        Integer,
        primary_key=True
    )

    host_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )

    title: Mapped[str] = mapped_column(
        String(150),
        nullable=False
    )

    description: Mapped[str | None] = mapped_column(
        Text,
        nullable=True
    )

    sport_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("sports.id"),
        nullable=False
    )

    max_participants: Mapped[int] = mapped_column(
        Integer,
        nullable=False
    )

    visibility: Mapped[str] = mapped_column(
        String(10),
        nullable=False
    )

    area: Mapped[str] = mapped_column(
        String(100),
        nullable=False
    )

    landmark: Mapped[str] = mapped_column(
        String(150),
        nullable=False
    )

    meetup_time: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        index=True
    )

    duration_minutes: Mapped[int] = mapped_column(
        Integer,
        nullable=False
    )

    status: Mapped[str] = mapped_column(
        String(30),
        nullable=False,
        default="upcoming",
        index=True
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now().astimezone()
    )

    confirmation_deadline: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True
    )

    finalized_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True
    )