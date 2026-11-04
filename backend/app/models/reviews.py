from sqlalchemy import Column, Integer, String, Text, ForeignKey
from sqlalchemy.orm import relationship

from db.base import Base


class Review(Base):
    __tablename__ = "reviews"

    id = Column(Integer, primary_key=True, index=True)

    reviewer_id = Column(
        Integer,
        ForeignKey("users.id"),
        nullable=False
    )

    reviewed_user_id = Column(
        Integer,
        ForeignKey("users.id"),
        nullable=False
    )

    comment = Column(
        Text,
        nullable=False
    )

    sentiment = Column(
        String(10),
        nullable=False
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