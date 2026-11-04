from pydantic import BaseModel, Field

class UserSportItem(BaseModel):
    sport_id: int
    playing_level: str


class UserSportsUpdate(BaseModel):
    sports: list[UserSportItem] = Field(max_length=50)