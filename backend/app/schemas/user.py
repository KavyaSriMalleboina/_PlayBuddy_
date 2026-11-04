from pydantic import BaseModel, ConfigDict, Field


class UserProfileUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    first_name: str | None = Field(
        default=None, min_length=1, max_length=100
    )
    last_name: str | None = Field(
        default=None, min_length=1, max_length=100
    )
    phone: str | None = Field(
        default=None, min_length=10, max_length=10
    )
    city: str | None = Field(default=None, max_length=100)
    area: str | None = Field(default=None, max_length=100)
    bio: str | None = Field(default=None, max_length=500)