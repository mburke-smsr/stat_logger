import React, { useMemo, useState } from "react";
import { apiFetch } from "../api";
import type { LogOut, Me, User } from "../types";

type Props = {
  me: Me;
  logs: LogOut[];
  usersById: Record<number, User>;
  onChanged?: () => Promise<void>;
};

function safeDate(raw: any): Date | null {
  if (!raw) return null;
  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? null : d;
}

function getPrimaryDate(log: any): Date | null {
  return safeDate(log.starts_at) || safeDate(log.date) || safeDate(log.created_at) || null;
}

function dateLabel(log: any) {
  const d = getPrimaryDate(log);
  return d ? d.toLocaleDateString() : "—";
}

function dateTimeLabel(log: any) {
  const d = getPrimaryDate(log);
  return d ? d.toLocaleString() : "—";
}

function userName(userId: any, usersById: Record<number, User>) {
  if (typeof userId === "number" && usersById[userId]) return usersById[userId].name;
  return "—";
}

function formatDuration(log: any) {
  const mins = log.duration_minutes;
  if (typeof mins === "number") {
    const hrs = mins / 60;
    const pretty = Number.isInteger(hrs) ? hrs.toString() : hrs.toFixed(1);
    return `${pretty}h (${mins}m)`;
  }
  return "—";
}

function canEdit(me: Me, log: LogOut) {
  return me.permission_level === "admin" || log.owner_id === me.id;
}

function normalizeString(v: any) {
  return v == null ? "" : String(v);
}

export default function RecentLogs({ me, logs, usersById, onChanged }: Props) {
  const [query, setQuery] = useState("");
  const [openId, setOpenId] = useState<number | null>(null);

  // edit state
  const [editingId, setEditingId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return logs;

    return logs.filter((l) => {
      const hay = [
        l.kind,
        l.title,
        l.notes,
        l.training_type,
        l.meeting_type,
        l.meeting_category,
        userName(l.owner_id, usersById),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return hay.includes(q);
    });
  }, [logs, usersById, query]);

  async function saveEdits(log: LogOut, draft: Partial<LogOut>) {
    setSaving(true);
    try {
      await apiFetch(`/logs/${log.id}`, {
        method: "PATCH",
        body: JSON.stringify(draft),
      });
      setEditingId(null);
      await onChanged?.();
    } finally {
      setSaving(false);
    }
  }

  async function deleteLog(log: LogOut) {
    setDeletingId(log.id);
    try {
      await apiFetch(`/logs/${log.id}`, { method: "DELETE" });
      if (openId === log.id) setOpenId(null);
      if (editingId === log.id) setEditingId(null);
      await onChanged?.();
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="card">
      <div className="cardHeader">
        <div>
          <div className="cardTitle">Recent Logs</div>
          <div className="cardDesc">Click the chevron to expand. Admin/Owner can edit & delete.</div>
        </div>

        <input
          className="input"
          placeholder="Search (title, notes, kind, user)…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          style={{ maxWidth: 360 }}
        />
      </div>

      <div className="cardBody">
        <div className="section">
          {filtered.length === 0 ? (
            <div style={{ color: "var(--muted2)", fontSize: 13 }}>No matching logs.</div>
          ) : null}

          {filtered.map((log) => {
            const isOpen = openId === log.id;
            const editable = canEdit(me, log);
            const isEditing = editingId === log.id;

            return (
              <div key={log.id} className="pill" style={{ padding: 0, borderRadius: 16 }}>
                {/* Row header */}
                <div
                  style={{
                    padding: "10px 12px",
                    display: "flex",
                    alignItems: "flex-start",
                    justifyContent: "space-between",
                    gap: 12,
                  }}
                >
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 800, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {log.title || (log.kind === "meeting" ? "Meeting" : "Training")}
                    </div>
                    <div style={{ fontSize: 12, color: "var(--muted2)", marginTop: 4 }}>
                      {log.kind} · {formatDuration(log)} · {userName(log.owner_id, usersById)}
                    </div>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ fontSize: 12, color: "var(--muted2)", whiteSpace: "nowrap" }}>{dateLabel(log)}</div>
                    <button
                      type="button"
                      className="btn"
                      onClick={() => setOpenId(isOpen ? null : log.id)}
                      aria-label={isOpen ? "Collapse" : "Expand"}
                      style={{ padding: "6px 10px", borderRadius: 999 }}
                    >
                      {isOpen ? "▴" : "▾"}
                    </button>
                  </div>
                </div>

                {/* Expanded */}
                {isOpen ? (
                  <ExpandedLog
                    me={me}
                    log={log}
                    usersById={usersById}
                    editable={editable}
                    isEditing={isEditing}
                    saving={saving}
                    deleting={deletingId === log.id}
                    onStartEdit={() => setEditingId(log.id)}
                    onCancelEdit={() => setEditingId(null)}
                    onSave={saveEdits}
                    onDelete={deleteLog}
                  />
                ) : null}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function ExpandedLog(props: {
  me: Me;
  log: LogOut;
  usersById: Record<number, User>;
  editable: boolean;
  isEditing: boolean;
  saving: boolean;
  deleting: boolean;
  onStartEdit: () => void;
  onCancelEdit: () => void;
  onSave: (log: LogOut, draft: Partial<LogOut>) => Promise<void>;
  onDelete: (log: LogOut) => Promise<void>;
}) {
  const { log, usersById, editable, isEditing, saving, deleting } = props;

  const [title, setTitle] = useState<string>(normalizeString(log.title));
  const [notes, setNotes] = useState<string>(normalizeString(log.notes));
  const [durationMinutes, setDurationMinutes] = useState<number>(log.duration_minutes ?? 0);

  // meeting-specific
  const [meetingType, setMeetingType] = useState<string>(normalizeString(log.meeting_type));
  const [meetingCategory, setMeetingCategory] = useState<string>(normalizeString(log.meeting_category));

  const owner = userName(log.owner_id, usersById);

  return (
    <div style={{ padding: "0 12px 12px 12px", borderTop: "1px solid var(--border)", display: "grid", gap: 10 }}>
      <div style={{ paddingTop: 10, display: "grid", gap: 6 }}>
        <DetailRow label="When" value={dateTimeLabel(log)} />
        <DetailRow label="Owner" value={owner} />
        <DetailRow label="Kind" value={log.kind} />
        <DetailRow label="Duration" value={`${durationMinutes}m`} />
      </div>

      {!editable ? (
        <div style={{ color: "var(--muted2)", fontSize: 13 }}>
          Only the creator or an admin can edit/delete this log.
        </div>
      ) : null}

      {/* View mode */}
      {!isEditing ? (
        <>
          {log.notes ? (
            <div className="card" style={{ background: "rgba(255,255,255,0.04)", boxShadow: "none" }}>
              <div className="cardBody" style={{ paddingTop: 12 }}>
                <div style={{ fontWeight: 750, marginBottom: 8 }}>Notes</div>
                <div style={{ fontSize: 13, lineHeight: 1.45, whiteSpace: "pre-wrap" }}>{log.notes}</div>
              </div>
            </div>
          ) : null}

          {editable ? (
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button className="btn" onClick={props.onStartEdit}>
                Edit
              </button>
              <button
                className="btn"
                onClick={() => {
                  const ok = window.confirm("Delete this log? This cannot be undone.");
                  if (ok) props.onDelete(log);
                }}
                disabled={deleting}
              >
                {deleting ? "Deleting…" : "Delete"}
              </button>
            </div>
          ) : null}
        </>
      ) : (
        /* Edit mode */
        <div className="card" style={{ background: "rgba(255,255,255,0.04)", boxShadow: "none" }}>
          <div className="cardBody" style={{ paddingTop: 12, display: "grid", gap: 10 }}>
            <div style={{ fontWeight: 750 }}>Edit Log</div>

            <div style={{ display: "grid", gap: 6 }}>
              <div style={{ fontSize: 13, color: "var(--muted)" }}>Title</div>
              <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} />
            </div>

            <div style={{ display: "grid", gap: 6 }}>
              <div style={{ fontSize: 13, color: "var(--muted)" }}>Duration (minutes)</div>
              <input
                className="input"
                type="number"
                min={0}
                value={durationMinutes}
                onChange={(e) => setDurationMinutes(parseInt(e.target.value || "0", 10))}
              />
            </div>

            {log.kind === "meeting" ? (
              <div style={{ display: "grid", gap: 10 }}>
                <div style={{ display: "grid", gap: 6 }}>
                  <div style={{ fontSize: 13, color: "var(--muted)" }}>Meeting type</div>
                  <input className="input" value={meetingType} onChange={(e) => setMeetingType(e.target.value)} />
                </div>

                <div style={{ display: "grid", gap: 6 }}>
                  <div style={{ fontSize: 13, color: "var(--muted)" }}>Category</div>
                  <input className="input" value={meetingCategory} onChange={(e) => setMeetingCategory(e.target.value)} />
                </div>

              </div>
            ) : null}

            <div style={{ display: "grid", gap: 6 }}>
              <div style={{ fontSize: 13, color: "var(--muted)" }}>Notes</div>
              <textarea
                className="input"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={5}
                style={{ resize: "vertical" }}
              />
            </div>

            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button className="btn" onClick={props.onCancelEdit} disabled={saving}>
                Cancel
              </button>
              <button
                className="btn btnPrimary"
                disabled={saving}
                onClick={() =>
                  props.onSave(log, {
                    title: title || null,
                    notes,
                    duration_minutes: durationMinutes,
                    meeting_type: log.kind === "meeting" ? (meetingType || null) : log.meeting_type,
                    meeting_category: log.kind === "meeting" ? (meetingCategory || null) : log.meeting_category,
                  })
                }
              >
                {saving ? "Saving…" : "Save changes"}
              </button>
            </div>
          </div>
        </div>
      )}

      <details style={{ marginTop: 2 }}>
        <summary style={{ cursor: "pointer", color: "var(--muted)" }}>Raw log data</summary>
        <pre
          style={{
            marginTop: 10,
            padding: 12,
            borderRadius: 14,
            border: "1px solid var(--border)",
            background: "rgba(0,0,0,0.25)",
            overflowX: "auto",
            fontSize: 12,
            color: "rgba(255,255,255,0.85)",
          }}
        >
          {JSON.stringify(log, null, 2)}
        </pre>
      </details>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 12, fontSize: 13 }}>
      <div style={{ color: "var(--muted)" }}>{label}</div>
      <div style={{ color: "var(--text)", textAlign: "right" }}>{value}</div>
    </div>
  );
}
