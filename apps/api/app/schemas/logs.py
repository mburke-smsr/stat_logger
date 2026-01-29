from pydantic import BaseModel, ConfigDict, Field
from datetime import datetime
from typing import Literal


class TrainingLogCreate(BaseModel):
    # Training flow
    training_type: Literal["personal", "probie", "team"]
    event_id: int | None = None

    # NEW: user-selectable start date/time (UI defaults to now)
    starts_at: datetime

    duration_minutes: int
    participant_user_ids: list[int] = []  # include self and others
    skill_ids: list[int] = []
    notes: str = ""


class MeetingLogCreate(BaseModel):
    # Meeting flow
    meeting_type: Literal["board", "team"]

    # NEW: user-selectable start date/time (UI defaults to now)
    starts_at: datetime

    duration_minutes: int
    participant_user_ids: list[int] = []  # include self and others

    # Optional: displayed in recent logs; useful for reporting
    title: str = ""

    # Team-only fields
    meeting_category: str = ""  # general | ops | training | logistics

    notes: str = ""


class LogPatch(BaseModel):
    """
    Partial update model. Only provided fields are updated.
    """
    model_config = ConfigDict(extra="forbid")

    # common
    starts_at: datetime | None = None
    duration_minutes: int | None = Field(default=None, ge=0)
    notes: str | None = None

    # participants & skills
    participant_user_ids: list[int] | None = None
    skill_ids: list[int] | None = None

    # training-only
    training_type: Literal["personal", "probie", "team"] | None = None
    event_id: int | None = None

    # meeting-only
    meeting_type: Literal["board", "team"] | None = None
    title: str | None = None
    meeting_category: str | None = None


class LogOut(BaseModel):
    id: int
    kind: str
    training_type: str | None
    meeting_type: str | None
    title: str | None
    meeting_category: str | None
    event_id: int | None
    owner_id: int

    # NEW: surface start datetime for UI display/sorting
    starts_at: datetime

    duration_minutes: int
    notes: str
    created_at: datetime
    skill_ids: list[int]
    participant_user_ids: list[int]

    class Config:
        from_attributes = True
