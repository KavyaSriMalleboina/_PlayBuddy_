from pydantic import BaseModel, Field


class ReviewCreate(BaseModel):

    comment: str = Field(
        min_length=5,
        max_length=1000
    )