from sqlalchemy import String, Integer
from sqlalchemy.orm import Mapped, mapped_column, relationship

from db.base import Base


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(
        Integer,
        primary_key=True
    )

    first_name: Mapped[str] = mapped_column(
        String(50),
        nullable=False
    )

    last_name: Mapped[str] = mapped_column(
        String(50),
        nullable=False
    )

    age: Mapped[int] = mapped_column(
        Integer,
        nullable=False
    )

    gender: Mapped[str] = mapped_column(
        String(30),
        nullable=False
    )

    email: Mapped[str] = mapped_column(
        String(100),
        unique=True,
        nullable=False
    )

    phone: Mapped[str] = mapped_column(
        String(15),
        unique=True,
        nullable=False
    )

    password_hash: Mapped[str] = mapped_column(
        String(255),
        nullable=False
    )

    country: Mapped[str] = mapped_column(
        String(50),
        nullable=False
    )

    state: Mapped[str] = mapped_column(
        String(50),
        nullable=False
    )

    city: Mapped[str] = mapped_column(
        String(50),
        nullable=False
    )

    area: Mapped[str] = mapped_column(
        String(100),
        nullable=False
    )

    bio : Mapped[str] = mapped_column(
        String(500),
        default=""
    )

    meetup_count : Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        default=0
    )

    sports: Mapped[list["UserSport"]] = relationship(  # type: ignore
        back_populates="user"
    )

    reviews_given = relationship(
        "Review",
        foreign_keys="Review.reviewer_id",
        back_populates="reviewer"
    )

    reviews_received = relationship(
        "Review",
        foreign_keys="Review.reviewed_user_id",
        back_populates="reviewed_user"
    )