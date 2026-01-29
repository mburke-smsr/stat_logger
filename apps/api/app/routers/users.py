from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.auth_deps import get_current_user, require_admin
from app.db.deps import get_db
from app.models.user import User
from app.schemas.user import UserRead, UserAdminUpdate, RosterUserOut

router = APIRouter()


@router.get("", response_model=list[UserRead])
def list_users(
    db: Session = Depends(get_db),
    _: User = Depends(require_admin()),  # admin-only list
) -> list[UserRead]:
    return db.query(User).order_by(User.name.asc(), User.email.asc()).all()

@router.get("/roster", response_model=list[RosterUserOut])
def roster(
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    return db.query(User).order_by(User.name.asc(), User.email.asc()).all()


@router.get("/me", response_model=UserRead)
def read_me(user: User = Depends(get_current_user)) -> UserRead:
    return user

@router.get("/{user_id}", response_model=UserRead)
def read_user(
    user_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin()),
) -> UserRead:
    user = db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    return user


@router.patch("/{user_id}", response_model=UserRead)
def admin_update_user(
    user_id: int,
    patch: UserAdminUpdate,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin()),
) -> UserRead:
    user = db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    data = patch.model_dump(exclude_unset=True)

    for k, v in data.items():
        setattr(user, k, v)

    db.add(user)
    db.commit()
    db.refresh(user)
    return user