from pwdlib import PasswordHash
import jwt
from datetime import datetime,timezone,timedelta
import os
from pathlib import Path
from dotenv import load_dotenv

PATH = Path(__file__).resolve().parents[3]

load_dotenv(PATH/".env")

password_hash = PasswordHash.recommended()

SECRET_KEY = os.getenv("SECRET_KEY")
ALGORITHM = os.getenv("ALGORITHM")
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES"))


def hash_password(password):
    return password_hash.hash(password)

def verify_password(password,hashed_password):
    return password_hash.verify(password,hashed_password)

def create_access_token(user_id):

    expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)

    payload = {
        "sub" : str(user_id),
        "exp" : expire
    }

    token = jwt.encode(payload,SECRET_KEY,algorithm=ALGORITHM)

    return token

def verify_access_token(token):
    
    try:
        payload = jwt.decode(token,SECRET_KEY,algorithms=[ALGORITHM])

        user_id = payload.get("sub")

        if user_id is None:
            raise ValueError("Invalid token")

        return int(user_id)

    except jwt.InvalidTokenError:
        raise ValueError("Invalid or Expired token")

