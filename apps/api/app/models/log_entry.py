from sqlalchemy import ForeignKey, DateTime, func, Text, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base

class LogEntry(Base):
    __tablename__ = "log_entries"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)

    # creator/author of this log (usually the person who submitted it)
    owner_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True, nullable=False)

    # Kind drives the UI flow and reporting (training vs meeting)
    kind: Mapped[str] = mapped_column(String, index=True, nullable=False, default="training")  # "training" | "meeting"

    # Training-specific subtype (nullable for meetings)
    training_type: Mapped[str | None] = mapped_column(String, index=True, nullable=True)  # "personal" | "probie" | "team"

    # Meeting-specific subtype (nullable for trainings)
    meeting_type: Mapped[str | None] = mapped_column(String, index=True, nullable=True)  # "board" | "team"

    # Optional high-level label (e.g., "BoD – January", "Team Meeting", "Partner Practice")
    title: Mapped[str | None] = mapped_column(String, nullable=True)

    # Meeting-only fields (kept nullable so training rows don't carry noise)
    meeting_category: Mapped[str | None] = mapped_column(String, nullable=True)  # e.g., general | ops | training | logistics

    # Optional association to a scheduled event (typically used for Team/Probie trainings)
    event_id: Mapped[int | None] = mapped_column(ForeignKey("events.id"), index=True, nullable=True)

    # When the activity started (drives UI default = now, and better reporting than "date-only")
    starts_at: Mapped[DateTime] = mapped_column(DateTime(timezone=True), nullable=False)

    duration_minutes: Mapped[int] = mapped_column(Integer, nullable=False)
    notes: Mapped[str] = mapped_column(Text, default="", nullable=False)
    created_at: Mapped[DateTime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    owner = relationship("User")
    event = relationship("Event")

    # skills (association object)
    skills = relationship("LogEntrySkill", cascade="all, delete-orphan")

    # roster / participants (lets one log apply to multiple members)
    participants = relationship("LogEntryParticipant", back_populates="entry", cascade="all, delete-orphan")
