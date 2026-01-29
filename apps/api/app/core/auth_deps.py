from fastapi import Cookie, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.security import COOKIE_NAME, decode_session_token
from app.db.deps import get_db
from app.models.user import User, UserPermission


def get_current_user(
    db: Session = Depends(get_db),
    smsr_session: str | None = Cookie(default=None, alias=COOKIE_NAME),
) -> User:
    if not smsr_session:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
        )

    payload = decode_session_token(smsr_session)
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid session",
        )

    user_id = int(payload.get("sub", 0) or 0)
    user = db.get(User, user_id)

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
        )

    return user


# --- Authorization helpers ---

def require_permission(*allowed: UserPermission):
    """
    Generic permission guard.
    Example:
        Depends(require_permission(UserPermission.admin))
    """
    def _inner(user: User = Depends(get_current_user)) -> User:
        if user.permission_level not in allowed:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Insufficient permissions",
            )
        return user

    return _inner


def require_admin():
    """
    Shortcut for admin-only endpoints.
    """
    return require_permission(UserPermission.admin)
