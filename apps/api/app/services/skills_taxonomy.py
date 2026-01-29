from __future__ import annotations

import json
from dataclasses import dataclass
from pathlib import Path

from sqlalchemy.orm import Session

from app.models.skill import Skill


@dataclass
class ReloadResult:
    created: int
    updated: int
    kept: int


def load_skills_json(path: str | Path):
    p = Path(path)
    data = json.loads(p.read_text(encoding="utf-8"))

    default_stale = int(data.get("default_stale_days", 120))
    cats = data.get("categories", {})

    out = []
    for category, entries in cats.items():
        for e in entries:
            if isinstance(e, str):
                out.append({
                    "name": e.strip(),
                    "category": category,
                    "stale_after_days": None,
                })
            elif isinstance(e, dict):
                out.append({
                    "name": e["name"].strip(),
                    "category": category,
                    "stale_after_days": int(e.get("stale_after_days", default_stale)),
                })
            else:
                raise ValueError(f"Invalid skill entry: {e!r}")

    return default_stale, out


def upsert_skills_from_json(db: Session, json_path: str | Path) -> ReloadResult:
    """
    Upsert skills from config/skills.json.

    - Skill.name is globally unique in the DB (current schema), so we upsert by name.
    - Category and stale_after_days are updated to match the JSON source of truth.
    - stale_after_days:
        * if entry sets it -> use that
        * else -> use default_stale_days from JSON
        * if JSON has no default -> 120
    """
    p = Path(json_path)
    data = json.loads(p.read_text(encoding="utf-8"))

    default_stale_days = int(data.get("default_stale_days", 120))
    cats = data.get("categories", {})

    if not isinstance(cats, dict):
        raise ValueError("skills.json must have top-level key 'categories' as an object")

    created = updated = kept = 0

    for category, entries in cats.items():
        if not isinstance(category, str) or not category.strip():
            raise ValueError(f"Invalid category: {category!r}")
        if not isinstance(entries, list):
            raise ValueError(f"Category '{category}' must be a list")

        category = category.strip()

        for entry in entries:
            # Support both "Anchors" and {"name":"Anchors","stale_after_days":90}
            if isinstance(entry, str):
                name = entry.strip()
                stale_after_days = default_stale_days
            elif isinstance(entry, dict):
                if "name" not in entry:
                    raise ValueError(f"Skill entry in '{category}' missing 'name': {entry!r}")
                name = str(entry["name"]).strip()
                stale_after_days = int(entry.get("stale_after_days", default_stale_days))
            else:
                raise ValueError(f"Invalid skill entry in '{category}': {entry!r}")

            if not name:
                continue

            # Your schema enforces Skill.name is globally unique.
            existing = db.query(Skill).filter(Skill.name == name).first()

            if existing:
                changed = False

                if existing.category != category:
                    existing.category = category
                    changed = True

                # normalize: store an int (or None if you prefer). We'll store int always.
                if existing.stale_after_days != stale_after_days:
                    existing.stale_after_days = stale_after_days
                    changed = True

                if changed:
                    updated += 1
                else:
                    kept += 1
                continue

            db.add(Skill(name=name, category=category, stale_after_days=stale_after_days))
            created += 1

    db.commit()
    return ReloadResult(created=created, updated=updated, kept=kept)
