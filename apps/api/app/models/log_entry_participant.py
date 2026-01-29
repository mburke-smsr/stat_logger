from sqlalchemy import ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base

class LogEntryParticipant(Base):
    __tablename__ = "log_entry_participants"

    entry_id: Mapped[int] = mapped_column(ForeignKey("log_entries.id"), primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), primary_key=True)

    entry = relationship("LogEntry", back_populates="participants")
    user = relationship("User")
