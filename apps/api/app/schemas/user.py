from __future__ import annotations

from pydantic import BaseModel, EmailStr, Field
from app.models.user import UserPermission, TeamStatusLevel


class UserRead(BaseModel):
    id: int
    email: EmailStr
    name: str

    permission_level: UserPermission
    team_status_level: TeamStatusLevel

    emt_id: int | None = None
    emt_instructor_id: int | None = None
    cpr_aed_id: int | None = None

    # Pydantic v2:
    model_config = {"from_attributes": True}


class UserAdminUpdate(BaseModel):
    # all optional so PATCH works cleanly
    permission_level: UserPermission | None = None
    team_status_level: TeamStatusLevel | None = None

    emt_id: int | None = Field(default=None, ge=1)
    emt_instructor_id: int | None = Field(default=None, ge=1)
    cpr_aed_id: int | None = Field(default=None, ge=1)


class RosterUserOut(BaseModel):
    id: int
    name: str
    email: EmailStr | None = None
    model_config = {"from_attributes": True}