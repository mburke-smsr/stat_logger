from pydantic import BaseModel, EmailStr
from app.models.user import UserPermission

class DevLoginRequest(BaseModel):
    email: EmailStr
    name: str | None = None

class AuthStatus(BaseModel):
    authenticated: bool
    email: EmailStr | None = None
    name: str | None = None
    permission_level: UserPermission | None = None
