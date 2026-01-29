from pydantic import BaseModel

class SkillOut(BaseModel):
    id: int
    name: str
    category: str

    class Config:
        from_attributes = True
