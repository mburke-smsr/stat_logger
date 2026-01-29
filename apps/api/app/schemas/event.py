from pydantic import BaseModel
from datetime import datetime

class EventCreate(BaseModel):
    title: str
    location: str = ""
    event_type: str = "training"
    starts_at: datetime
    ends_at: datetime
    notes: str = ""

class EventOut(BaseModel):
    id: int
    title: str
    location: str
    event_type: str
    starts_at: datetime
    ends_at: datetime
    notes: str

    class Config:
        from_attributes = True
