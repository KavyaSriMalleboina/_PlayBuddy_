from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, or_, and_, case

from db.database import get_db
from core.dependencies import get_current_user

from models.user import User
from models.user_sports import UserSport
from models.sports import Sport
from models.connections import Connection
from models.reviews import Review

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

@router.get("/{player_id}/profile")
def get_public_profile(
    player_id: int,

    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):

    # --------------------------------------------------
    # 1. GET PLAYER
    # --------------------------------------------------

    player = db.query(User).filter(
        User.id == player_id
    ).first()

    if not player:
        raise HTTPException(
            status_code=404,
            detail="Player not found"
        )


    # --------------------------------------------------
    # 2. BASIC INFORMATION
    # --------------------------------------------------

    basic_info = {
        "id": player.id,
        "first_name": player.first_name,
        "last_name": player.last_name,
        "age": player.age,
        "gender": player.gender,
        "country": player.country,
        "state": player.state,
        "city": player.city,
        "area": player.area,
        "bio": player.bio
    }


    # --------------------------------------------------
    # 3. MEETUP AND CONNECTION COUNTS
    # --------------------------------------------------

    meetup_count = player.meetup_count

    connection_count = db.query(
        func.count(Connection.id)
    ).filter(
        Connection.status == "accepted",
        or_(
            Connection.sender_id == player_id,
            Connection.receiver_id == player_id
        )
    ).scalar() or 0


    # --------------------------------------------------
    # 4. SPORTS AND PLAYING LEVELS
    # --------------------------------------------------

    sports = db.query(
        UserSport,
        Sport
    ).join(
        Sport,
        UserSport.sport_id == Sport.id
    ).filter(
        UserSport.user_id == player_id
    ).all()

    sports_data = [
        {
            "sport_id": user_sport.sport_id,
            "sport_name": sport.name,
            "playing_level": user_sport.playing_level
        }
        for user_sport, sport in sports
    ]


    # --------------------------------------------------
    # 5. REVIEW STATISTICS
    # --------------------------------------------------

    review_results = db.query(
        Review.sentiment,
        func.count(Review.id)
    ).filter(
        Review.reviewed_user_id == player_id
    ).group_by(
        Review.sentiment
    ).all()

    review_stats = {
        "positive": 0,
        "neutral": 0,
        "negative": 0,
        "total": 0
    }

    for sentiment, count in review_results:

        if sentiment in review_stats:
            review_stats[sentiment] = count

    review_stats["total"] = sum([
        review_stats["positive"],
        review_stats["neutral"],
        review_stats["negative"]
    ])


    # --------------------------------------------------
    # 6. MUTUAL CONNECTIONS
    # --------------------------------------------------

    # Get all accepted connections of current user.

    current_connections = db.query(
        case(
            (
                Connection.sender_id == current_user.id,
                Connection.receiver_id
            ),
            else_=Connection.sender_id
        ).label("user_id")
    ).filter(
        Connection.status == "accepted",
        or_(
            Connection.sender_id == current_user.id,
            Connection.receiver_id == current_user.id
        )
    ).subquery()


    # Get all accepted connections of profile owner.

    player_connections = db.query(
        case(
            (
                Connection.sender_id == player_id,
                Connection.receiver_id
            ),
            else_=Connection.sender_id
        ).label("user_id")
    ).filter(
        Connection.status == "accepted",
        or_(
            Connection.sender_id == player_id,
            Connection.receiver_id == player_id
        )
    ).subquery()


    # Find common connections.

    mutual_connections = db.query(
        User.id,
        User.first_name,
        User.last_name,
        User.city
    ).filter(
        User.id.in_(
            db.query(current_connections.c.user_id)
        ),
        User.id.in_(
            db.query(player_connections.c.user_id)
        ),
        User.id != current_user.id,
        User.id != player_id
    ).all()


    mutual_connections_data = [
        {
            "id": mutual.id,
            "first_name": mutual.first_name,
            "last_name": mutual.last_name,
            "city": mutual.city
        }
        for mutual in mutual_connections
    ]


    # --------------------------------------------------
    # 7. CONNECTION STATUS
    # --------------------------------------------------

    connection_status = "not_connected"
    connection_id = None

    if current_user.id == player_id:

        connection_status = "self"

    else:

        connection = db.query(Connection).filter(
            or_(
                and_(
                    Connection.sender_id == current_user.id,
                    Connection.receiver_id == player_id
                ),
                and_(
                    Connection.sender_id == player_id,
                    Connection.receiver_id == current_user.id
                )
            )
        ).first()

        if connection:

            connection_id = connection.id

            if connection.status == "accepted":

                connection_status = "connected"

            elif connection.sender_id == current_user.id:

                connection_status = "request_sent"

            else:

                connection_status = "request_received"


    # --------------------------------------------------
    # 8. FINAL RESPONSE
    # --------------------------------------------------

    return {

        "basic_info": basic_info,

        "statistics": {
            "meetup_count": meetup_count,
            "connection_count": connection_count
        },

        "sports": sports_data,

        "reviews": review_stats,

        "mutual_connections": {
            "count": len(mutual_connections_data),
            "players": mutual_connections_data
        },

        "relationship": {
            "status": connection_status,
            "connection_id": connection_id
        }

    }



@router.get("/recommendations")
def get_recommendations():
    pass
