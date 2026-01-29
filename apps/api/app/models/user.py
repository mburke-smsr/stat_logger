import enum
from sqlalchemy import String, DateTime, func, Enum, Integer
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base

class UserPermission(str, enum.Enum):
    admin = "admin"
    member = "member"


class TeamStatusLevel(str, enum.Enum):
    probationary = "probationary"
    loa = "loa"
    regular = "regular"
    specialist = "specialist"
    associate = "associate"


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)

    email: Mapped[str] = mapped_column(
        String(320), unique=True, index=True, nullable=False
    )

    name: Mapped[str] = mapped_column(String(200), default="", nullable=False)

    permission_level: Mapped[UserPermission] = mapped_column(
        Enum(UserPermission, name="user_permission", native_enum=False),
        default=UserPermission.member,
        nullable=False,
    )

    team_status_level: Mapped[TeamStatusLevel] = mapped_column(
        Enum(TeamStatusLevel, name="team_status_level", native_enum=False),
        default=TeamStatusLevel.regular,
        nullable=False,
    )

    emt_id: Mapped[int | None] = mapped_column(Integer, nullable=True)
    emt_instructor_id: Mapped[int | None] = mapped_column(Integer, nullable=True)
    cpr_aed_id: Mapped[int | None] = mapped_column(Integer, nullable=True)

    created_at: Mapped[DateTime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
