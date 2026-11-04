from sqlalchemy import *
from sqlalchemy.orm import *

import os
from pathlib import Path
from dotenv import load_dotenv


PATH = Path(__file__).resolve().parents[3]

load_dotenv(PATH/".env")

DB_URL = os.getenv("DB_URL")

engine = create_engine(DB_URL)

def get_db():
    session = Session(engine)
    try:
        yield session
    finally:
        session.close()