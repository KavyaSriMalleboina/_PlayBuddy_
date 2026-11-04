from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field, ConfigDict


class MeetupCreate(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    title: str = Field(min_length=3, max_length=150)
    description: str | None = Field(default=None, max_length=1000)

    sport_id: int = Field(gt=0)

    max_participants: int = Field(ge=2, le=100)

    visibility: Literal["public", "private"]

    area: str = Field(min_length=2, max_length=100)
    landmark: str = Field(min_length=2, max_length=200)

    meetup_time: datetime
    duration_minutes: int = Field(ge=15, le=720)