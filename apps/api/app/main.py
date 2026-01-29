from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.settings import settings
from app.db.session import engine
from app.db.base import Base
from app.routers import auth, events, skills, logs, me, users, reports, admin_skills
from app.seed import seed_skills_if_empty
from app.services.skills_taxonomy import upsert_skills_from_json
from app.db.session import SessionLocal

app = FastAPI(title="SMSR Training Log API", version="0.3.0")

# CORS (frontend dev)
origins = [o.strip() for o in settings.cors_origins.split(",") if o.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins or ["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
def on_startup() -> None:
    # In this skeleton we auto-create tables (Alembic is included for later hardening).
    # NOTE: SQLite won't auto-add new columns to an existing db. During dev, delete smsr.db if you pull schema updates.
    Base.metadata.create_all(bind=engine)
#    #seed_skills_if_empty()

@app.on_event("startup")
def load_skill_taxonomy_on_startup():
    db = SessionLocal()
    try:
        upsert_skills_from_json(db, "config/skills.json")
    finally:
        db.close()

app.include_router(auth.router, prefix="/auth", tags=["auth"])
app.include_router(me.router, prefix="", tags=["me"])
app.include_router(users.router, prefix="/users", tags=["users"])
app.include_router(skills.router, prefix="/skills", tags=["skills"])
app.include_router(events.router, prefix="/events", tags=["events"])
app.include_router(logs.router, prefix="/logs", tags=["logs"])
app.include_router(reports.router, prefix="/reports", tags=["reports"])
app.include_router(admin_skills.router, prefix="/admin", tags=["admin"])