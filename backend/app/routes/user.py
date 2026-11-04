from fastapi import APIRouter,Depends, HTTPException
from sqlalchemy import *
from sqlalchemy.orm import *
from models.user import User
from models.reviews import Review
from models.sports import Sport
from models.user_sports import UserSport
from core.dependencies import get_current_user as get_user
from schemas.user import UserProfileUpdate
from schemas.user_sports import UserSportItem,UserSportsUpdate
from db.database import get_db

router = APIRouter(
    prefix="/users",
    tags=["Users"]
)

@router.get("/current")
def get_current_user(
    current_user: User = Depends(get_user)
):
    return {
            "user": {
                "id": current_user.id,
                "first_name": current_user.first_name,
                "last_name": current_user.last_name,
                "email": current_user.email,
                "phone": current_user.phone,
                "city": current_user.city,
                "area": current_user.area,
                "bio": current_user.bio,
                "meetup_count": current_user.meetup_count,
            }
        }

@router.patch("/current")
def update_current_user(
    profile_data: UserProfileUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_user),
):
    updates = profile_data.model_dump(exclude_unset=True)

    for field, value in updates.items():
        setattr(current_user, field, value)

    db.commit()
    db.refresh(current_user)

    return {
        "user": {
            "id": current_user.id,
            "first_name": current_user.first_name,
            "last_name": current_user.last_name,
            "email": current_user.email,
            "phone": current_user.phone,
            "city": current_user.city,
            "area": current_user.area,
            "bio": current_user.bio,
            "meetup_count": current_user.meetup_count,
        }
    }

@router.get("/current/reviews-stats")
def get_review_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_user),
):
    results = (
        db.query(Review.sentiment, func.count(Review.id))
        .filter(Review.reviewed_user_id == current_user.id)
        .group_by(Review.sentiment)
        .all()
    )

    stats = {
        "positive": 0,
        "neutral": 0,
        "negative": 0,
    }

    for sentiment, count in results:
        if sentiment in stats:
            stats[sentiment] = count

    stats["total"] = sum(stats.values())

    return stats

@router.get("/current/sports")
def get_current_sports(db = Depends(get_db), current_user = Depends(get_user)):
    results = (
        db.query(UserSport, Sport)
        .join(Sport, UserSport.sport_id == Sport.id)
        .filter(UserSport.user_id == current_user.id)
        .all()
    )

    return {
        "sports": [
            {
                "sport_id": user_sport.sport_id,
                "sport_name": sport.name,
                "playing_level": user_sport.playing_level
            }
            for user_sport, sport in results
        ]
    }

@router.put("/current/sports")
def update_current_sports(request : UserSportsUpdate, db = Depends(get_db), current_user = Depends(get_user)):
    try:
        existing_sports = (
            db.query(UserSport)
            .filter(UserSport.user_id == current_user.id)
            .all()
        )

        for user_sport in existing_sports:
            db.delete(user_sport)

        for item in request.sports:
            user_sport = UserSport(
                user_id=current_user.id,
                sport_id=item.sport_id,
                playing_level=item.playing_level
            )

            db.add(user_sport)

        db.commit()

    except Exception:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail="Failed to update sports preferences."
        )

