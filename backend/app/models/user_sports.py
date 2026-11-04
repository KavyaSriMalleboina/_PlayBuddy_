from sqlalchemy import ForeignKey, String, Integer
from sqlalchemy.orm import Mapped, mapped_column, relationship

from db.base import Base


class UserSport(Base):

    __tablename__ = "user_sports"

    id: Mapped[int] = mapped_column(
        Integer,
        primary_key=True
    )

    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id"),
        nullable=False
    )

    sport_id: Mapped[int] = mapped_column(
        ForeignKey("sports.id"),
        nullable=False
    )

    playing_level: Mapped[str] = mapped_column(
        String(20),
        nullable=False
    )

    user: Mapped["User"] = relationship( # type: ignore
        back_populates="sports"
    )

    sport: Mapped["Sport"] = relationship( # type: ignore
        back_populates="users"
    )