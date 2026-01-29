from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.auth_deps import get_current_user
from app.db.deps import get_db
from app.models.log_entry import LogEntry
from app.models.log_entry_skill import LogEntrySkill
from app.models.log_entry_participant import LogEntryParticipant
from app.models.skill import Skill
from app.schemas.logs import TrainingLogCreate, MeetingLogCreate, LogOut, LogPatch
from app.models.user import User
from datetime import datetime, timezone

router = APIRouter()

def _validate_duration(duration_minutes: int) -> None:
    if duration_minutes <= 0 or duration_minutes > 24 * 60:
        raise HTTPException(status_code=400, detail="duration_minutes out of range")

def _validate_skill_ids(db: Session, skill_ids: list[int]) -> list[int]:
    skill_ids = list(dict.fromkeys(skill_ids or []))
    if not skill_ids:
        return []
    existing = db.query(Skill.id).filter(Skill.id.in_(skill_ids)).all()
    existing_ids = {sid for (sid,) in existing}
    missing = [sid for sid in skill_ids if sid not in existing_ids]
    if missing:
        raise HTTPException(status_code=400, detail=f"Unknown skill_ids: {missing}")
    return skill_ids

def _log_out(entry: LogEntry, skill_ids: list[int], participant_user_ids: list[int]) -> LogOut:
    return LogOut(
        id=entry.id,
        kind=entry.kind,
        training_type=entry.training_type,
        meeting_type=entry.meeting_type,
        title=entry.title,
        meeting_category=entry.meeting_category,
        event_id=entry.event_id,
        owner_id=entry.owner_id,
        starts_at=entry.starts_at,
        duration_minutes=entry.duration_minutes,
        notes=entry.notes,
        created_at=entry.created_at,
        skill_ids=skill_ids,
        participant_user_ids=sorted(list(dict.fromkeys(participant_user_ids))),
    )

def _require_owner_or_admin(user: User, entry: LogEntry) -> None:
    if user.permission_level == "admin":
        return
    if entry.owner_id == user.id:
        return
    raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not allowed")

def _get_skill_ids_for_entry(db: Session, entry_id: int) -> list[int]:
    rows = db.query(LogEntrySkill.skill_id).filter(LogEntrySkill.entry_id == entry_id).all()
    return sorted([sid for (sid,) in rows])


def _get_participant_ids_for_entry(db: Session, entry_id: int) -> list[int]:
    rows = db.query(LogEntryParticipant.user_id).filter(LogEntryParticipant.entry_id == entry_id).all()
    return sorted([uid for (uid,) in rows])


def _replace_participants(db: Session, entry_id: int, participant_ids: list[int]) -> None:
    db.query(LogEntryParticipant).filter(LogEntryParticipant.entry_id == entry_id).delete()
    for uid in participant_ids:
        db.add(LogEntryParticipant(entry_id=entry_id, user_id=uid))


def _replace_skills(db: Session, entry_id: int, skill_ids: list[int]) -> None:
    db.query(LogEntrySkill).filter(LogEntrySkill.entry_id == entry_id).delete()
    for sid in skill_ids:
        db.add(LogEntrySkill(entry_id=entry_id, skill_id=sid))


@router.post("/training", response_model=LogOut)
def create_training_log(
    payload: TrainingLogCreate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> LogOut:
    _validate_duration(payload.duration_minutes)

    if payload.training_type not in {"personal", "probie", "team"}:
        raise HTTPException(status_code=400, detail="Invalid training_type")

    skill_ids = _validate_skill_ids(db, payload.skill_ids or [])

    # Ensure the requester is included in roster
    participant_ids = set(payload.participant_user_ids or [])
    participant_ids.add(user.id)

    entry = LogEntry(
        owner_id=user.id,
        kind="training",
        training_type=payload.training_type,
        meeting_type=None,
        title=None,
        meeting_category=None,
        event_id=payload.event_id,
        starts_at=payload.starts_at,
        duration_minutes=payload.duration_minutes,
        notes=payload.notes or "",
    )
    db.add(entry)
    db.commit()
    db.refresh(entry)

    # Participants
    for uid in participant_ids:
        db.add(LogEntryParticipant(entry_id=entry.id, user_id=uid))
    db.commit()

    # Skills
    for sid in skill_ids:
        db.add(LogEntrySkill(entry_id=entry.id, skill_id=sid))
    db.commit()

    return _log_out(entry, skill_ids, list(participant_ids))

@router.post("/meeting", response_model=LogOut)
def create_meeting_log(
    payload: MeetingLogCreate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> LogOut:
    _validate_duration(payload.duration_minutes)
    if payload.meeting_type not in {"board", "team"}:
        raise HTTPException(status_code=400, detail="Invalid meeting_type")

    # Meeting field validation
    title = (payload.title or "").strip() or None
    category = (payload.meeting_category or "").strip() or None

    if payload.meeting_type == "board":
        # category isn't meaningful for board meetings
        category = None

    entry = LogEntry(
        owner_id=user.id,
        kind="meeting",
        training_type=None,
        meeting_type=payload.meeting_type,
        title=title,
        meeting_category=category,
        event_id=None,
        starts_at=payload.starts_at,
        duration_minutes=payload.duration_minutes,
        notes=payload.notes or "",
    )
    db.add(entry)
    db.commit()
    db.refresh(entry)

    # Meetings can have a roster (attendees)
    participant_ids = set(payload.participant_user_ids or [])
    participant_ids.add(user.id)
    for uid in participant_ids:
        db.add(LogEntryParticipant(entry_id=entry.id, user_id=uid))
    db.commit()

    return _log_out(entry, [], sorted(list(participant_ids)))



@router.get("/recent", response_model=list[LogOut])
def list_recent_logs(
    limit: int = 500,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> list[LogOut]:
    limit = max(1, min(limit, 2000))

    # Permission hook (for later):
    can_view_all = True  # later: user.permission_level == "admin"

    q = db.query(LogEntry).order_by(LogEntry.starts_at.desc())
    if not can_view_all:
        q = q.filter(LogEntry.owner_id == user.id)

    entries = q.limit(limit).all()
    entry_ids = [e.id for e in entries]

    # Skills
    skill_map: dict[int, list[int]] = {}
    if entry_ids:
        rows = (
            db.query(LogEntrySkill.entry_id, LogEntrySkill.skill_id)
            .filter(LogEntrySkill.entry_id.in_(entry_ids))
            .all()
        )
        for eid, sid in rows:
            skill_map.setdefault(eid, []).append(sid)

    # Participants
    part_map: dict[int, list[int]] = {}
    if entry_ids:
        rows = (
            db.query(LogEntryParticipant.entry_id, LogEntryParticipant.user_id)
            .filter(LogEntryParticipant.entry_id.in_(entry_ids))
            .all()
        )
        for eid, uid in rows:
            part_map.setdefault(eid, []).append(uid)

    out: list[LogOut] = []
    for e in entries:
        out.append(
            LogOut(
                id=e.id,
                kind=e.kind,
                training_type=e.training_type,
                meeting_type=e.meeting_type,
                title=e.title,
                meeting_category=e.meeting_category,
                event_id=e.event_id,
                owner_id=e.owner_id,
                starts_at=e.starts_at,
                duration_minutes=e.duration_minutes,
                notes=e.notes or "",
                created_at=e.created_at,
                skill_ids=sorted(list(dict.fromkeys(skill_map.get(e.id, [])))),
                participant_user_ids=sorted(list(dict.fromkeys(part_map.get(e.id, [e.owner_id])))),
            )
        )
    return out



@router.get("/mine", response_model=list[LogOut])
def list_my_logs(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
    limit: int = 50,
) -> list[LogOut]:
    limit = max(1, min(limit, 200))

    # Include logs you authored OR logs where you're a participant
    entries = (
        db.query(LogEntry)
        .outerjoin(LogEntryParticipant, LogEntryParticipant.entry_id == LogEntry.id)
        .filter((LogEntry.owner_id == user.id) | (LogEntryParticipant.user_id == user.id))
        .order_by(LogEntry.starts_at.desc())
        .distinct()
        .limit(limit)
        .all()
    )

    entry_ids = [e.id for e in entries]

    # skills mapping
    skill_map: dict[int, list[int]] = {}
    if entry_ids:
        rows = (
            db.query(LogEntrySkill.entry_id, LogEntrySkill.skill_id)
            .filter(LogEntrySkill.entry_id.in_(entry_ids))
            .all()
        )
        for eid, sid in rows:
            skill_map.setdefault(eid, []).append(sid)

    # participant mapping
    part_map: dict[int, list[int]] = {}
    if entry_ids:
        rows = (
            db.query(LogEntryParticipant.entry_id, LogEntryParticipant.user_id)
            .filter(LogEntryParticipant.entry_id.in_(entry_ids))
            .all()
        )
        for eid, uid in rows:
            part_map.setdefault(eid, []).append(uid)

    out: list[LogOut] = []
    for e in entries:
        out.append(_log_out(
            e,
            sorted(list(dict.fromkeys(skill_map.get(e.id, [])))),
            part_map.get(e.id, [e.owner_id]),
        ))
    return out


@router.patch("/{entry_id}", response_model=LogOut)
def patch_log(
    entry_id: int,
    payload: LogPatch,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> LogOut:
    entry = db.query(LogEntry).filter(LogEntry.id == entry_id).first()
    if not entry:
        raise HTTPException(status_code=404, detail="Log not found")

    _require_owner_or_admin(user, entry)

    data = payload.model_dump(exclude_unset=True)

    # Never allow changing these
    data.pop("id", None)
    data.pop("owner_id", None)
    data.pop("kind", None)
    data.pop("created_at", None)

    # duration validation if provided
    if "duration_minutes" in data and data["duration_minutes"] is not None:
        _validate_duration(int(data["duration_minutes"]))

    # Participants update (optional)
    if "participant_user_ids" in data and data["participant_user_ids"] is not None:
        participant_ids = set(data["participant_user_ids"] or [])
        participant_ids.add(entry.owner_id)  # owner always included
        _replace_participants(db, entry.id, sorted(list(participant_ids)))

    # Skills update (optional, training only)
    if "skill_ids" in data and data["skill_ids"] is not None:
        if entry.kind != "training":
            raise HTTPException(status_code=400, detail="skill_ids only valid for training logs")
        skill_ids = _validate_skill_ids(db, data["skill_ids"] or [])
        _replace_skills(db, entry.id, skill_ids)

    # Kind-specific field rules
    if entry.kind == "training":
        if "training_type" in data and data["training_type"] is not None:
            if data["training_type"] not in {"personal", "probie", "team"}:
                raise HTTPException(status_code=400, detail="Invalid training_type")
            entry.training_type = data["training_type"]

        # Allow these
        if "event_id" in data:
            entry.event_id = data["event_id"]
        if "starts_at" in data and data["starts_at"] is not None:
            entry.starts_at = data["starts_at"]
        if "notes" in data and data["notes"] is not None:
            entry.notes = data["notes"]
        if "title" in data:
            entry.title = None  # training logs don't use title
        if "meeting_type" in data or "meeting_category" in data:
            # ignore meeting fields for training logs
            pass

        if "duration_minutes" in data and data["duration_minutes"] is not None:
            entry.duration_minutes = int(data["duration_minutes"])

    elif entry.kind == "meeting":
        if "meeting_type" in data and data["meeting_type"] is not None:
            if data["meeting_type"] not in {"board", "team"}:
                raise HTTPException(status_code=400, detail="Invalid meeting_type")
            entry.meeting_type = data["meeting_type"]

        # title/category rules
        if "title" in data:
            entry.title = (data["title"] or "").strip() or None

        if "meeting_category" in data:
            cat = (data["meeting_category"] or "").strip() or None
            # If board meeting, category not meaningful
            if entry.meeting_type == "board":
                cat = None
            entry.meeting_category = cat

        if "starts_at" in data and data["starts_at"] is not None:
            entry.starts_at = data["starts_at"]

        if "notes" in data and data["notes"] is not None:
            entry.notes = data["notes"]

        if "duration_minutes" in data and data["duration_minutes"] is not None:
            entry.duration_minutes = int(data["duration_minutes"])

        # Training fields ignored for meetings
        if "training_type" in data or "event_id" in data:
            pass

    else:
        raise HTTPException(status_code=400, detail="Unknown log kind")

    db.add(entry)
    db.commit()
    db.refresh(entry)

    # Build response using latest join-table state
    skill_ids = _get_skill_ids_for_entry(db, entry.id) if entry.kind == "training" else []
    participant_ids = _get_participant_ids_for_entry(db, entry.id)

    return _log_out(entry, skill_ids, participant_ids)


@router.delete("/{entry_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_log(
    entry_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    entry = db.query(LogEntry).filter(LogEntry.id == entry_id).first()
    if not entry:
        raise HTTPException(status_code=404, detail="Log not found")

    _require_owner_or_admin(user, entry)

    # Cleanup join rows (optional if you have cascading, but safe)
    db.query(LogEntrySkill).filter(LogEntrySkill.entry_id == entry.id).delete()
    db.query(LogEntryParticipant).filter(LogEntryParticipant.entry_id == entry.id).delete()

    db.delete(entry)
    db.commit()
    return None