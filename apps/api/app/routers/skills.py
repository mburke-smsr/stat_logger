from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.db.deps import get_db
from app.schemas.skill import SkillOut
from app.models.skill import Skill

router = APIRouter()

@router.get("", response_model=list[SkillOut])
def list_skills(db: Session = Depends(get_db)) -> list[SkillOut]:
    return db.query(Skill).order_by(Skill.category.asc(), Skill.name.asc()).all()
