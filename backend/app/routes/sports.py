from fastapi import APIRouter,Depends
from sqlalchemy import *
from sqlalchemy.orm import *
from models.sports import Sport
from db.database import get_db

router = APIRouter(
    prefix="/sports",
    tags=["Sports"]
)

@router.get("/")
def get_sports(db = Depends(get_db)):
    sports = db.query(Sport).all()
    return {
        "sports": [
            {
                "id": sport.id,
                "name": sport.name
            }
            for sport in sports
        ]
    }