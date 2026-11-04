from sqlalchemy import String, Integer
from sqlalchemy.orm import Mapped, mapped_column, relationship

from db.base import Base


class Sport(Base):

    __tablename__ = "sports"

    id: Mapped[int] = mapped_column(
        Integer,
        primary_key=True
    )

    name: Mapped[str] = mapped_column(
        String(50),
        unique=True,
        nullable=False
    )

    users: Mapped[list["UserSport"]] = relationship(# type: ignore 
        back_populates="sport"
    )