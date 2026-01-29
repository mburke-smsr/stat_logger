from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from datetime import datetime, timedelta, timezone

from app.core.auth_deps import get_current_user
from app.db.deps import get_db
from app.models.event import Event
from app.schemas.event import EventCreate, EventOut
from app.models.user import User

router = APIRouter()

@router.post("", response_model=EventOut)
def create_event(
    payload: EventCreate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> EventOut:
    event = Event(**payload.model_dump())
    db.add(event)
    db.commit()
    db.refresh(event)
    return event

@router.get("", response_model=list[EventOut])
def list_events(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
    days: int = 30,
) -> list[EventOut]:
    now = datetime.now(timezone.utc)
    start = now - timedelta(days=days)
    return (
        db.query(Event)
        .filter(Event.starts_at >= start)
        .order_by(Event.starts_at.desc())
        .limit(200)
        .all()
    )
