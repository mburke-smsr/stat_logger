from fastapi import APIRouter, Depends
from app.core.auth_deps import get_current_user
from app.schemas.me import MeOut
from app.models.user import User

router = APIRouter()

@router.get("/me", response_model=MeOut)
def me(user: User = Depends(get_current_user)) -> MeOut:
    return user
