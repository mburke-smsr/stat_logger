from __future__ import annotations

from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.core.auth_deps import get_current_user
from app.db.deps import get_db
from app.models.log_entry import LogEntry
from app.models.log_entry_participant import LogEntryParticipant
from app.models.log_entry_skill import LogEntrySkill
from app.models.skill import Skill
from app.models.user import User

router = APIRouter()


@router.get("/summary")
def report_summary(
    days: int = 90,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    """
    Aggregate dashboard summary.
    Notes:
      - Counts are PER PARTICIPANT (each attendee gets full duration credit).
      - Training totals come from LogEntry.kind == "training"
      - Meeting totals come from LogEntry.kind == "meeting"
    """
    if days < 1 or days > 3650:
        raise HTTPException(status_code=400, detail="days out of range (1..3650)")

    now = datetime.now(timezone.utc)
    cutoff = now - timedelta(days=days)

    # ---------- Totals (per participant) ----------
    base_part = (
        db.query(LogEntry.kind, func.coalesce(func.sum(LogEntry.duration_minutes), 0))
        .join(LogEntryParticipant, LogEntryParticipant.entry_id == LogEntry.id)
        .filter(LogEntry.starts_at >= cutoff)
        .group_by(LogEntry.kind)
        .all()
    )

    totals = {"training_minutes": 0, "meeting_minutes": 0}
    for kind, minutes in base_part:
        if kind == "training":
            totals["training_minutes"] = int(minutes or 0)
        elif kind == "meeting":
            totals["meeting_minutes"] = int(minutes or 0)

    # ---------- Top skills (training only, per participant) ----------
    top_skills_rows = (
        db.query(
            LogEntrySkill.skill_id.label("skill_id"),
            func.coalesce(func.sum(LogEntry.duration_minutes), 0).label("minutes"),
            func.count(func.distinct(LogEntry.id)).label("sessions"),
        )
        .join(LogEntry, LogEntry.id == LogEntrySkill.entry_id)
        .join(LogEntryParticipant, LogEntryParticipant.entry_id == LogEntry.id)
        .filter(LogEntry.kind == "training")
        .filter(LogEntry.starts_at >= cutoff)
        .group_by(LogEntrySkill.skill_id)
        .order_by(func.sum(LogEntry.duration_minutes).desc())
        .limit(20)
        .all()
    )

    top_skills = [
        {"skill_id": int(r.skill_id), "minutes": int(r.minutes or 0), "sessions": int(r.sessions or 0)}
        for r in top_skills_rows
    ]

    # ---------- Member totals (training + meeting, per participant) ----------
    member_rows = (
        db.query(
            LogEntryParticipant.user_id.label("user_id"),
            LogEntry.kind.label("kind"),
            func.coalesce(func.sum(LogEntry.duration_minutes), 0).label("minutes"),
        )
        .join(LogEntry, LogEntry.id == LogEntryParticipant.entry_id)
        .filter(LogEntry.starts_at >= cutoff)
        .group_by(LogEntryParticipant.user_id, LogEntry.kind)
        .all()
    )

    # reshape into one row per user
    member_map: dict[int, dict] = {}
    for user_id, kind, minutes in member_rows:
        uid = int(user_id)
        if uid not in member_map:
            member_map[uid] = {
                "user_id": uid,
                "training_minutes": 0,
                "meeting_minutes": 0,
                "total_minutes": 0,
            }
        m = int(minutes or 0)
        if kind == "training":
            member_map[uid]["training_minutes"] = m
        elif kind == "meeting":
            member_map[uid]["meeting_minutes"] = m

    for uid, row in member_map.items():
        row["total_minutes"] = int(row["training_minutes"]) + int(row["meeting_minutes"])

    member_totals = sorted(member_map.values(), key=lambda r: r["total_minutes"], reverse=True)

     # ---------- Skill gaps (team-wide, per-skill stale threshold) ----------
    DEFAULT_STALE_DAYS = 120

    # Last trained date across ALL TIME for each skill
    last_skill_rows = (
        db.query(
            LogEntrySkill.skill_id.label("skill_id"),
            func.max(LogEntry.starts_at).label("last_trained_at"),
        )
        .join(LogEntry, LogEntry.id == LogEntrySkill.entry_id)
        .filter(LogEntry.kind == "training")
        .group_by(LogEntrySkill.skill_id)
        .all()
    )
    last_skill_map = {int(r.skill_id): r.last_trained_at for r in last_skill_rows}

    # Pull all skills so we can apply per-skill thresholds
    skills = db.query(Skill).all()

    skill_gaps = []
    for s in skills:
        last_dt = last_skill_map.get(int(s.id))

        # per-skill override; fallback to DEFAULT_STALE_DAYS
        stale_after_days = int(getattr(s, "stale_after_days", None) or DEFAULT_STALE_DAYS)

        if last_dt is None:
            skill_gaps.append(
                {
                    "skill_id": int(s.id),
                    "status": "never",
                    "last_trained_at": None,
                    "days_since": None,
                    "stale_after_days": stale_after_days,
                }
            )
            continue

        if last_dt.tzinfo is None:
            last_dt = last_dt.replace(tzinfo=timezone.utc)
        days_since = int((now - last_dt).total_seconds() // 86400)

        if days_since > stale_after_days:
            skill_gaps.append(
                {
                    "skill_id": int(s.id),
                    "status": "stale",
                    "last_trained_at": last_dt.isoformat(),
                    "days_since": days_since,
                    "stale_after_days": stale_after_days,
                }
            )

    # Sort gaps: never-trained first, then largest days_since (stalest)
    def gap_sort_key(item: dict):
        if item["status"] == "never":
            return (0, 10**9)
        return (1, int(item["days_since"] or 0))

    skill_gaps.sort(key=gap_sort_key, reverse=False)

    return {
        "range_days": days,
        "cutoff": cutoff.isoformat(),
        "totals": totals,
        "top_skills": top_skills,
        "default_stale_days": 120,
        "skill_gaps": skill_gaps[:50],  # keep payload reasonable
        "member_totals": member_totals[:200],
    }
