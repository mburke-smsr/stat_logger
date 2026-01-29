from sqlalchemy.orm import Session

from app.db.session import SessionLocal
from app.models.skill import Skill

DEFAULT_SKILLS = [
    # Rope/Tech
    ("Anchors", "Rope/Tech"),
    ("Haul Systems", "Rope/Tech"),
    ("Edge Transitions", "Rope/Tech"),
    ("Litter Ops", "Rope/Tech"),
    ("Rigging", "Rope/Tech"),
    # Medical
    ("Patient Packaging", "Medical"),
    ("WFA/WFR Skills", "Medical"),
    ("Hypothermia", "Medical"),
    # Comms
    ("Radio Comms", "Comms"),
    ("Repeater Ops", "Comms"),
    # Navigation
    ("Map & Compass", "Navigation"),
    ("GPS/Nav Apps", "Navigation"),
    # Snow/Ice
    ("Snow Travel", "Snow/Ice"),
    ("Avalanche Awareness", "Snow/Ice"),
    # Swiftwater
    ("Swiftwater Basics", "Swiftwater"),
    # Search
    ("Search Tactics", "Search"),
    ("Clue Awareness", "Search"),
    # Leadership
    ("Field Leadership", "Leadership"),
    ("IC/Plans", "Leadership"),
    # Ops
    ("Night Ops", "Operations"),
    ("Driving/4x4", "Operations"),
]

def seed_skills_if_empty() -> None:
    db: Session = SessionLocal()
    try:
        count = db.query(Skill).count()
        if count > 0:
            return
        for name, category in DEFAULT_SKILLS:
            db.add(Skill(name=name, category=category))
        db.commit()
    finally:
        db.close()
