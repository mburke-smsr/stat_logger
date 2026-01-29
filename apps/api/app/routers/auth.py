from fastapi import APIRouter, Depends, Response
from sqlalchemy.orm import Session

from app.core.settings import settings
from app.core.security import create_session_token, COOKIE_NAME
from app.db.deps import get_db
from app.models.user import User, UserPermission
from app.schemas.auth import DevLoginRequest, AuthStatus

router = APIRouter()


@router.post("/dev-login", response_model=AuthStatus)
def dev_login(payload: DevLoginRequest, response: Response, db: Session = Depends(get_db)) -> AuthStatus:
    email = payload.email.lower().strip()

    user_count = db.query(User).count()

    user = db.query(User).filter(User.email == email).one_or_none()
    if not user:
        user = User(
            email=email,
            name=(payload.name or "").strip(),
            permission_level=UserPermission.admin if user_count == 0 else UserPermission.member,
        )
        db.add(user)
        db.commit()
        db.refresh(user)
    else:
        if payload.name and payload.name.strip() and user.name != payload.name.strip():
            user.name = payload.name.strip()
            db.commit()

    # Put permission_level into token as "role" for now (so your existing token schema keeps working)
    token = create_session_token(
        user_id=user.id,
        email=user.email,
        permission_level=user.permission_level.value,
    )

    response.set_cookie(
        key=COOKIE_NAME,
        value=token,
        httponly=True,
        secure=bool(settings.cookie_secure),
        samesite="lax",
        max_age=60 * 60 * 24 * 7,
        path="/",
    )

    # Return the new field but keep the response shape stable
    return AuthStatus(
        authenticated=True,
        email=user.email,
        name=user.name,
        permission_level=user.permission_level.value,
    )


@router.post("/logout")
def logout(response: Response) -> dict:
    response.delete_cookie(key=COOKIE_NAME, path="/")
    return {"ok": True}