from pydantic import BaseModel, EmailStr
from app.models.user import UserPermission, TeamStatusLevel

class MeOut(BaseModel):
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
