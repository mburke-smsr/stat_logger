import React, { useEffect, useMemo, useState } from "react";
import { apiFetch } from "../api";
import type { User } from "../types";

type PermissionLevel = "admin" | "member";
type TeamStatusLevel = "probationary" | "loa" | "regular" | "specialist" | "associate";

type PatchUser = Partial<Pick<
  User,
  "permission_level" | "team_status_level" | "emt_id" | "emt_instructor_id" | "cpr_aed_id"
>>;

function toIntOrNull(v: string): number | null {
  const s = v.trim();
  if (s === "") return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

export default function AdminUsersPanel() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // local edit buffer per user id
  const [drafts, setDrafts] = useState<Record<number, PatchUser>>({});
  const [saving, setSaving] = useState<Record<number, boolean>>({});
  const [savedAt, setSavedAt] = useState<Record<number, string>>({});

  const permissionOptions: PermissionLevel[] = ["member", "admin"];
  const statusOptions: TeamStatusLevel[] = ["probationary", "loa", "regular", "specialist", "associate"];

  async function load() {
    setLoading(true);
    setErr(null);
    try {
      const resp = (await apiFetch("/users")) as User[];
      setUsers(resp);
      setDrafts({});
    } catch (e: any) {
      // your apiFetch may throw string or Error — keep it simple
      setErr(e?.message ?? String(e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const usersById = useMemo(() => {
    const m = new Map<number, User>();
    for (const u of users) m.set(u.id, u);
    return m;
  }, [users]);

  function getDraftValue<T extends keyof PatchUser>(userId: number, key: T): PatchUser[T] {
    return drafts[userId]?.[key] ?? (usersById.get(userId)?.[key] as any);
  }

  function setDraft(userId: number, patch: PatchUser) {
    setDrafts((prev) => ({
      ...prev,
      [userId]: { ...(prev[userId] ?? {}), ...patch },
    }));
    setSavedAt((prev) => ({ ...prev, [userId]: "" }));
  }

  function isDirty(userId: number) {
    const d = drafts[userId];
    return d && Object.keys(d).length > 0;
  }

  async function saveRow(userId: number) {
    const patch = drafts[userId];
    if (!patch || Object.keys(patch).length === 0) return;

    setSaving((prev) => ({ ...prev, [userId]: true }));
    setErr(null);

    try {
      const updated = (await apiFetch(`/users/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      })) as User;

      // update local list
      setUsers((prev) => prev.map((u) => (u.id === userId ? updated : u)));
      // clear draft for row
      setDrafts((prev) => {
        const next = { ...prev };
        delete next[userId];
        return next;
      });
      setSavedAt((prev) => ({ ...prev, [userId]: new Date().toLocaleTimeString() }));
    } catch (e: any) {
      setErr(e?.message ?? String(e));
    } finally {
      setSaving((prev) => ({ ...prev, [userId]: false }));
    }
  }

  async function resetRow(userId: number) {
    setDrafts((prev) => {
      const next = { ...prev };
      delete next[userId];
      return next;
    });
    setSavedAt((prev) => ({ ...prev, [userId]: "" }));
  }

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <h2 style={{ margin: 0 }}>Admin – Users</h2>
        <button onClick={load} disabled={loading}>
          {loading ? "Loading…" : "Refresh"}
        </button>
      </div>

      <div style={{ color: "#666", fontSize: 12, marginTop: 6 }}>
        Edit fields inline. Cert IDs: blank = None. Save per row.
      </div>

      {err && (
        <div style={{ marginTop: 12, padding: 10, border: "1px solid #e99", background: "#fee", borderRadius: 8 }}>
          <b>Error:</b> {err}
        </div>
      )}

      <div style={{ overflowX: "auto", marginTop: 12 }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ textAlign: "left" }}>
              {["Name", "Email", "Permission", "Team status", "EMT", "EMT Instr", "CPR/AED", "Actions"].map((h) => (
                <th key={h} style={{ padding: "8px 6px", borderBottom: "1px solid #ddd", whiteSpace: "nowrap" }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {users.map((u) => {
              const rowSaving = !!saving[u.id];
              const dirty = isDirty(u.id);

              const permission = getDraftValue(u.id, "permission_level") as PermissionLevel;
              const status = getDraftValue(u.id, "team_status_level") as TeamStatusLevel;

              const emt = getDraftValue(u.id, "emt_id");
              const emtInstr = getDraftValue(u.id, "emt_instructor_id");
              const cpr = getDraftValue(u.id, "cpr_aed_id");

              return (
                <tr key={u.id}>
                  <td style={{ padding: "8px 6px", borderBottom: "1px solid #f0f0f0" }}>{u.name || "—"}</td>
                  <td style={{ padding: "8px 6px", borderBottom: "1px solid #f0f0f0" }}>{u.email}</td>

                  <td style={{ padding: "8px 6px", borderBottom: "1px solid #f0f0f0" }}>
                    <select
                      value={permission}
                      onChange={(e) => setDraft(u.id, { permission_level: e.target.value as PermissionLevel })}
                      disabled={rowSaving}
                    >
                      {permissionOptions.map((p) => (
                        <option key={p} value={p}>
                          {p}
                        </option>
                      ))}
                    </select>
                  </td>

                  <td style={{ padding: "8px 6px", borderBottom: "1px solid #f0f0f0" }}>
                    <select
                      value={status}
                      onChange={(e) => setDraft(u.id, { team_status_level: e.target.value as TeamStatusLevel })}
                      disabled={rowSaving}
                    >
                      {statusOptions.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </td>

                  <td style={{ padding: "8px 6px", borderBottom: "1px solid #f0f0f0" }}>
                    <input
                      style={{ width: 90 }}
                      value={emt ?? ""}
                      onChange={(e) => setDraft(u.id, { emt_id: toIntOrNull(e.target.value) })}
                      disabled={rowSaving}
                      placeholder="None"
                    />
                  </td>

                  <td style={{ padding: "8px 6px", borderBottom: "1px solid #f0f0f0" }}>
                    <input
                      style={{ width: 90 }}
                      value={emtInstr ?? ""}
                      onChange={(e) => setDraft(u.id, { emt_instructor_id: toIntOrNull(e.target.value) })}
                      disabled={rowSaving}
                      placeholder="None"
                    />
                  </td>

                  <td style={{ padding: "8px 6px", borderBottom: "1px solid #f0f0f0" }}>
                    <input
                      style={{ width: 90 }}
                      value={cpr ?? ""}
                      onChange={(e) => setDraft(u.id, { cpr_aed_id: toIntOrNull(e.target.value) })}
                      disabled={rowSaving}
                      placeholder="None"
                    />
                  </td>

                  <td style={{ padding: "8px 6px", borderBottom: "1px solid #f0f0f0", whiteSpace: "nowrap" }}>
                    <button onClick={() => saveRow(u.id)} disabled={!dirty || rowSaving}>
                      {rowSaving ? "Saving…" : "Save"}
                    </button>
                    <button onClick={() => resetRow(u.id)} disabled={!dirty || rowSaving} style={{ marginLeft: 8 }}>
                      Reset
                    </button>
                    {savedAt[u.id] && (
                      <span style={{ marginLeft: 10, color: "#666", fontSize: 12 }}>Saved {savedAt[u.id]}</span>
                    )}
                  </td>
                </tr>
              );
            })}

            {users.length === 0 && !loading && (
              <tr>
                <td colSpan={8} style={{ padding: 12, color: "#666" }}>
                  No users found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
