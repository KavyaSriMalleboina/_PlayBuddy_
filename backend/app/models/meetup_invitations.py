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


class MeetupInvitation(Base):

    __tablename__ = "meetup_invitations"

    __table_args__ = (

        UniqueConstraint(
            "meetup_id",
            "invited_user_id",
            name="unique_meetup_invitation"
        ),

        CheckConstraint(
            """
            invitation_status IN (
                'pending',
                'accepted',
                'declined'
            )
            """,
            name="check_invitation_status"
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

    invited_user_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )

    invitation_status: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
        default="pending"
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now().astimezone()
    )