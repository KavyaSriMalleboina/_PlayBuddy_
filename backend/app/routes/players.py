from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import Connection, func, or_

from models.reviews import Review
from db.database import get_db
from core.dependencies import get_current_user

from models.user import User
from models.user_sports import UserSport
from models.sports import Sport

router = APIRouter(
    prefix="/players",
    tags=["Players"]
)


@router.get("")
def search_players(
    search: str | None = Query(default=None, max_length=100),
    city: str | None = Query(default=None, max_length=50),
    sport: str | None = Query(default=None, max_length=50),
    skill_level: str | None = Query(default=None, max_length=20),
    limit: int = Query(default=20, ge=1, le=100),
    offset: int = Query(default=0, ge=0),

    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(User)

    # Exclude the logged-in user
    query = query.filter(User.id != current_user.id)

    # Name search
    if search and search.strip():
        search_term = search.strip()

        query = query.filter(
            or_(
                User.first_name.ilike(f"%{search_term}%"),
                User.last_name.ilike(f"%{search_term}%")
            )
        )

    # City filter
    if city and city.strip():
        query = query.filter(
            User.city.ilike(f"%{city.strip()}%")
        )

    # Sport and skill-level filters
    if sport and sport.strip():

        sport_condition = (
            UserSport.sport.has(
                Sport.name.ilike(sport.strip())
            )
        )

        if skill_level and skill_level.strip():
            sport_condition = (
                sport_condition &
                (UserSport.playing_level.ilike(skill_level.strip()))
            )

        query = query.filter(
            User.sports.any(sport_condition)
        )

    # Skill-level filter without sport
    elif skill_level and skill_level.strip():
        query = query.filter(
            User.sports.any(
                UserSport.playing_level.ilike(skill_level.strip())
            )
        )

    # Total matching players before pagination
    total = query.count()

    # Fetch players
    players = (
        query
        .order_by(User.id)
        .offset(offset)
        .limit(limit)
        .all()
    )

    return {
        "players": [
            {
                "id": player.id,
                "first_name": player.first_name,
                "last_name": player.last_name,
                "city": player.city,
                "bio": player.bio
            }
            for player in players
        ],
        "total": total,
        "limit": limit,
        "offset": offset
    }

@router.get("/{player_id}")
def get_public_profile(
    player_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    player = db.query(User).filter(
        User.id == player_id
    ).first()

    if not player:
        raise HTTPException(
            status_code=404,
            detail="Player not found"
        )

    sports = []

    for user_sport in player.sports:
        sports.append({
            "sport_id": user_sport.sport_id,
            "sport_name": user_sport.sport.name,
            "playing_level": user_sport.playing_level
        })

    review_count = db.query(
        func.count(Review.id)
    ).filter(
        Review.reviewed_user_id == player_id
    ).scalar() or 0

    # Your Review model currently contains sentiment,
    # not a numerical rating column.
    average_rating = None

    connection = db.query(Connection).filter(
        Connection.status == "accepted",
        or_(
            (
                (Connection.sender_id == current_user.id)
                & (Connection.receiver_id == player_id)
            ),
            (
                (Connection.sender_id == player_id)
                & (Connection.receiver_id == current_user.id)
            )
        )
    ).first()

    connection_status = (
        "accepted"
        if connection
        else "none"
    )

    if current_user.id == player_id:
        connection_status = "self"

    buddy_count = db.query(
        func.count(Connection.sender_id)
    ).filter(
        Connection.status == "accepted",
        or_(
            Connection.sender_id == player_id,
            Connection.receiver_id == player_id
        )
    ).scalar() or 0

    return {
        "id": player.id,
        "first_name": player.first_name,
        "last_name": player.last_name,
        "city": player.city,
        "area": player.area,
        "bio": player.bio,
        "buddy_count": buddy_count,
        "meetup_count": player.meetup_count,
        "sports": sports,
        "reviews": {
            "average_rating": average_rating,
            "total_reviews": review_count
        },
        "connection_status": connection_status
    }



@router.get("/recommendations")
def get_recommendations():
    pass
