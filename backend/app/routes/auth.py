from fastapi import *
from sqlalchemy.orm import Session

from models.user import User
from models.sports import Sport
from models.user_sports import UserSport

from db.database import get_db
from core.security import *

from schemas.auth import RegisterRequest,LoginRequest

router = APIRouter(
    prefix="/auth",
    tags=["Authentication"]
)

@router.post("/register")
def register(
    data: RegisterRequest,
    db: Session = Depends(get_db) # type: ignore
):

    # Check whether email already exists
    existing_user = (
        db.query(User)
        .filter(User.email == data.email)
        .first()
    )

    if existing_user:
        raise HTTPException(
            status_code=409,
            detail="Email already registered"
        )

    # Hash password
    hashed_password = hash_password(data.password)

    # Create user
    user = User(
        first_name=data.first_name,
        last_name=data.last_name,
        age=data.age,
        gender=data.gender,
        email=data.email,
        phone=data.phone,
        password_hash=hashed_password,
        country=data.country,
        state=data.state,
        city=data.city,
        area=data.area
    )

    db.add(user)

    # Get user.id
    db.flush()

    # Create UserSport records
    for sport_name, playing_level in data.sports.items():

        if playing_level == "":
            continue

        sport = (
            db.query(Sport)
            .filter(Sport.name == sport_name)
            .first()
        )

        if not sport:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid sport: {sport_name}"
            )

        user_sport = UserSport(
            user_id=user.id,
            sport_id=sport.id,
            playing_level=playing_level
        )

        db.add(user_sport)

    db.commit()
    db.refresh(user)

    return {
        "message": "Registration successful",
        "user_id": user.id
    }


@router.post("/login")
def login(
    data: LoginRequest,
    response: Response,
    db: Session = Depends(get_db)
):
    user = db.query(User).filter(
        User.email == data.username
    ).first()

    if not user:
        raise HTTPException(
            status_code=401,
            detail="Invalid Credentials"
        )

    correct_password = verify_password(
        data.password,
        user.password_hash
    )

    if not correct_password:
        raise HTTPException(
            status_code=401,
            detail="Invalid Credentials"
        )

    access_token = create_access_token(user.id)

    response.set_cookie(
        key="access_token",
        value=access_token,
        httponly=True,
        secure=False,
        samesite="lax",
        max_age=60 * 60
    )

    return {
        "message": "Login successful"
    }


@router.post("/logout")
def logout(response: Response):

    response.delete_cookie(
        key="access_token"
    )

    return {
        "message": "Logout successful"
    }