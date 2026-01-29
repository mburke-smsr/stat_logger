# SMSR Training Log App (Skeleton)

Low-friction SAR training & skills logging app.

This repo contains:
- `apps/api` — FastAPI backend (dev auth, sessions, users, events, rostered logs, skills)
- `apps/web` — React PWA frontend (login + “what are you logging?” flow + training log)

## Current flow (v0.3)
1. **What are you logging?**
   - Training
   - Meeting
2. **Training**
   - Training Type: **Personal / Probie / Team** (easy to expand later)
   - Optional Event
   - Duration
   - **Roster** (personal training can still include other team members)
   - Skill chips
   - Notes

3. **Meeting**
   - Meeting Type: **Board of Directors / Team**
   - Different fields by type:
     - **Board:** role (attendee/chair/presenter/secretary), optional agenda/topic
     - **Team:** category (general/ops/training/logistics), optional topic
   - Duration
   - Attendees (roster)
   - Notes

## Quick start (Docker)

1. Install Docker Desktop.
2. From repo root:

```bash
docker compose up --build
```

3. Open:
- Web UI: http://localhost:5173
- API docs (Swagger): http://localhost:8000/docs

### Dev login
Use any email. (Later we'll lock this down to your Google Workspace domain.)

## Local dev (no Docker)

### API (Windows PowerShell)
```powershell
cd apps/api
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
copy .env.example .env
uvicorn app.main:app --reload
```

### API (macOS/Linux)
```bash
cd apps/api
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
uvicorn app.main:app --reload
```

### Web (Windows/macOS/Linux)
```bash
cd apps/web
npm install
npm run dev
```

## Important note (SQLite schema updates)
This skeleton uses `Base.metadata.create_all()` for speed. SQLite does **not** auto-add columns to an existing database.
If you pull updates that change models, delete your local db file and restart the API:

- `apps/api/smsr.db` (default path)

(Alembic is included for later hardening.)

## Environment variables

Backend (`apps/api/.env`):
- `DATABASE_URL` (default sqlite)
- `JWT_SECRET` (dev default exists)
- `CORS_ORIGINS` (comma separated; default includes localhost:5173)

## Notes
- Auth mode is currently **dev**: email-only login -> HttpOnly cookie session.
- Skill chips are controlled vocabulary (`skills` table), not freeform tags.
- Roster is normalized via `log_entry_participants` so one training log can include multiple members.
