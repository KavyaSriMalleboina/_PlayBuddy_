from sqlalchemy import (
    Column,
    Integer,
    String,
    Text,
    ForeignKey,
    UniqueConstraint,
    CheckConstraint
)
from sqlalchemy.orm import relationship

from db.base import Base


class Review(Base):
    __tablename__ = "reviews"

    __table_args__ = (
        UniqueConstraint(
            "reviewer_id",
            "reviewed_user_id",
            name="unique_player_review"
        ),

        CheckConstraint(
            "reviewer_id != reviewed_user_id",
            name="check_review_different_users"
        )
    )

    id = Column(
        Integer,
        primary_key=True,
        index=True
    )

    reviewer_id = Column(
        Integer,
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False
    )

    reviewed_user_id = Column(
        Integer,
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False
    )

    comment = Column(
        Text,
        nullable=False
    )

    sentiment = Column(
        String(10),
        nullable=False,
        default="neutral"
    )

    reviewer = relationship(
        "User",
        foreign_keys=[reviewer_id],
        back_populates="reviews_given"
    )

    reviewed_user = relationship(
        "User",
        foreign_keys=[reviewed_user_id],
        back_populates="reviews_received"
    )