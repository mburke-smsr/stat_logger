from datetime import datetime, timedelta, timezone
from jose import jwt, JWTError

from app.core.settings import settings

ALGORITHM = "HS256"
COOKIE_NAME = "smsr_session"

def create_session_token(*, user_id: int, email: str, permission_level: str, minutes: int = 60 * 24 * 7) -> str:
    now = datetime.now(timezone.utc)
    payload = {
        "sub": str(user_id),
        "email": email,
        "permission_level": permission_level,
        "iat": int(now.timestamp()),
        "exp": int((now + timedelta(minutes=minutes)).timestamp()),
    }
    return jwt.encode(payload, settings.jwt_secret, algorithm=ALGORITHM)

def decode_session_token(token: str) -> dict | None:
    try:
        return jwt.decode(token, settings.jwt_secret, algorithms=[ALGORITHM])
    except JWTError:
        return None
