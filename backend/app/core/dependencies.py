
from fastapi import Cookie,Depends, HTTPException
from sqlalchemy.orm import Session

from db.database import get_db
from models.user import User
from core.security import verify_access_token


def get_current_user(
    access_token: str | None = Cookie(default=None),
    db: Session = Depends(get_db)
):

    if access_token is None:
        raise HTTPException(
            status_code=401,
            detail="Not authenticated"
        )

    try:
        user_id = verify_access_token(access_token)

    except ValueError:
        raise HTTPException(
            status_code=401,
            detail="Invalid or expired token"
        )

    user = db.query(User).filter(User.id == user_id).first()

    if not user:
        raise HTTPException(
            status_code=401,
            detail="User not found"
        )

    return user