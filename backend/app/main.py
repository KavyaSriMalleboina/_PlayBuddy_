import asyncio
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from sqlalchemy.orm import Session

from services.meetup_lifecycle import reconcile_meetup
from db.base import Base
from db.database import engine

from models.user import User
from models.sports import Sport
from models.user_sports import UserSport
from models.connections import Connection
from models.meetups import Meetup
from models.meetup_participants import MeetupParticipant
from models.meetup_invitations import MeetupInvitation

from routes.auth import router as auth_router
from routes.user import router as current
from routes.sports import router as sports_router
from routes.players import router as player_router
from routes.connections import router as connections_router
from routes.meetups import router as meetup_router
from routes.meetup_invitations import router as meetup_invitation_router
from routes.meetup_management import router as meetup_management_router
from routes.meetup_outcomes import router as meetup_outcomes_router
from routes.meetup_history import router as meetup_history_router


Base.metadata.create_all(bind=engine)

def reconcile_due_meetups():
    with Session(engine) as db:
        due_meetups = db.query(Meetup).filter(
            Meetup.status.in_([
                "upcoming",
                "ongoing",
                "awaiting_confirmation"
            ])
        ).all()

        for meetup in due_meetups:
            reconcile_meetup(db, meetup)

        db.commit()

@asynccontextmanager
async def lifespan(app: FastAPI):
    async def lifecycle_worker():
        while True:
            try:
                await asyncio.to_thread(reconcile_due_meetups)
            except Exception as e:
                print("Meetup lifecycle error:", e)

            await asyncio.sleep(60 * 5)

    task = asyncio.create_task(lifecycle_worker())

    yield

    task.cancel()
    try:
        await task
    except asyncio.CancelledError:
        pass

app = FastAPI(lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)
app.include_router(current)
app.include_router(sports_router)
app.include_router(player_router)
app.include_router(connections_router)

# Meetup routes
app.include_router(meetup_invitation_router)
app.include_router(meetup_outcomes_router)
app.include_router(meetup_history_router)
app.include_router(meetup_router)
app.include_router(meetup_management_router)
