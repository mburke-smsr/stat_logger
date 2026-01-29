from sqlalchemy import ForeignKey, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base

class LogEntrySkill(Base):
    __tablename__ = "log_entry_skills"
    __table_args__ = (UniqueConstraint("entry_id", "skill_id", name="uq_entry_skill"),)

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    entry_id: Mapped[int] = mapped_column(ForeignKey("log_entries.id"), index=True, nullable=False)
    skill_id: Mapped[int] = mapped_column(ForeignKey("skills.id"), index=True, nullable=False)
