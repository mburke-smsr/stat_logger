from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db.deps import get_db
from app.services.skills_taxonomy import upsert_skills_from_json

router = APIRouter()

@router.post("/skills/reload")
def reload_skills(db: Session = Depends(get_db)):
    result = upsert_skills_from_json(db, "config/skills.json")
    return {"created": result.created, "updated": result.updated, "kept": result.kept}
