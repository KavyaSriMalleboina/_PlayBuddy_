from datetime import datetime

from sqlalchemy import (
    Integer,
    String,
    DateTime,
    ForeignKey,
    CheckConstraint
)
from sqlalchemy.orm import Mapped, mapped_column

from db.base import Base


class Connection(Base):
    __tablename__ = "connections"

    __table_args__ = (
        CheckConstraint(
            "sender_id != receiver_id",
            name="check_different_users"
        ),
        CheckConstraint(
            "status IN ('pending', 'accepted')",
            name="check_valid_connection_status"
        ),
    )

    id: Mapped[int] = mapped_column(
        Integer,
        primary_key=True
    )

    sender_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )

    receiver_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )

    status: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
        default="pending"
    )

    connected_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True
    )