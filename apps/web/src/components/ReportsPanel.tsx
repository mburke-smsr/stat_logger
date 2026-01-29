import React, { useMemo, useState } from "react";
import type { LogOut, Me, Skill, User } from "../types";

type Props = {
  me: Me;
  logs: LogOut[];
  rosterUsers: User[];
  skills: Skill[];

  /**
   * Hook for future permissions (e.g. members can only view themselves).
   * For now this should be true for everyone.
   */
  canViewAllUsers?: boolean;
};

type KindFilter = "all" | "training" | "meeting";
type Preset = "30d" | "90d" | "365d" | "all";

function isoDate(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function safeDate(raw: any): Date | null {
  if (!raw) return null;
  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? null : d;
}

function logWhen(log: LogOut): Date | null {
  // Some code paths use starts_at; older models may not.
  return (
    safeDate((log as any).starts_at) ||
    safeDate((log as any).startsAt) ||
    safeDate(log.created_at) ||
    null
  );
}

function fmtHours(mins: number) {
  const hrs = (mins ?? 0) / 60;
  if (Number.isNaN(hrs) || !Number.isFinite(hrs)) return "—";
  const pretty = Math.round(hrs * 10) / 10;
  return `${pretty}h`;
}

function monthKey(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

export default function ReportsPanel({
  me,
  logs,
  rosterUsers,
  skills,
  canViewAllUsers = true,
}: Props) {
  const skillsById = useMemo(() => {
    const m = new Map<number, Skill>();
    for (const s of skills) m.set(s.id, s);
    return m;
  }, [skills]);

  const usersById = useMemo(() => {
    const m = new Map<number, User>();
    for (const u of rosterUsers) m.set(u.id, u);
    return m;
  }, [rosterUsers]);

  const today = useMemo(() => new Date(), []);

  // Filters
  const [preset, setPreset] = useState<Preset>("90d");
  const [startDate, setStartDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() - 90);
    return isoDate(d);
  });
  const [endDate, setEndDate] = useState<string>(() => isoDate(new Date()));

  const [kind, setKind] = useState<KindFilter>("all");
  const [ownerId, setOwnerId] = useState<number | "all">("all");
  const [trainingType, setTrainingType] = useState<"all" | "personal" | "probie" | "team">("all");
  const [meetingType, setMeetingType] = useState<"all" | "board" | "team">("all");

  const [groupBy, setGroupBy] = useState<"month" | "user" | "skill">("month");

  function applyPreset(p: Preset) {
    setPreset(p);
    if (p === "all") {
      setStartDate("");
      setEndDate("");
      return;
    }
    const d = new Date();
    const days = p === "30d" ? 30 : p === "90d" ? 90 : 365;
    const start = new Date(d);
    start.setDate(start.getDate() - days);
    setStartDate(isoDate(start));
    setEndDate(isoDate(d));
  }

  const filtered = useMemo(() => {
    const s = startDate ? safeDate(startDate) : null;
    const e = endDate ? safeDate(endDate) : null;
    // include entire end day
    const eMax = e ? new Date(e.getTime() + 24 * 60 * 60 * 1000) : null;

    return logs
      .map((l) => ({ l, when: logWhen(l) }))
      .filter(({ l, when }) => {
        if (kind !== "all" && l.kind !== kind) return false;

        // permissions hook:
        if (canViewAllUsers) {
          if (ownerId !== "all" && l.owner_id !== ownerId) return false;
        } else {
          // clamp to current user
          if (l.owner_id !== me.id) return false;
        }

        if (l.kind === "training" && trainingType !== "all") {
          if ((l.training_type ?? "") !== trainingType) return false;
        }

        if (l.kind === "meeting" && meetingType !== "all") {
          if ((l.meeting_type ?? "") !== meetingType) return false;
        }

        if (s && (!when || when < s)) return false;
        if (eMax && (!when || when >= eMax)) return false;

        return true;
      })
      .sort((a, b) => {
        const at = a.when?.getTime() ?? 0;
        const bt = b.when?.getTime() ?? 0;
        return bt - at;
      });
  }, [logs, startDate, endDate, kind, ownerId, trainingType, meetingType, canViewAllUsers, me.id]);

  const kpis = useMemo(() => {
    let totalM = 0;
    let trainingM = 0;
    let meetingM = 0;
    const skillSet = new Set<number>();

    for (const { l } of filtered) {
      const mins = l.duration_minutes ?? 0;
      totalM += mins;
      if (l.kind === "training") trainingM += mins;
      if (l.kind === "meeting") meetingM += mins;
      for (const sid of l.skill_ids ?? []) skillSet.add(sid);
    }

    return {
      count: filtered.length,
      totalM,
      trainingM,
      meetingM,
      uniqueSkills: skillSet.size,
    };
  }, [filtered]);

  const grouped = useMemo(() => {
    if (groupBy === "month") {
      const m = new Map<string, { minutes: number; count: number }>();
      for (const { l, when } of filtered) {
        const d = when ?? today;
        const k = monthKey(d);
        const cur = m.get(k) ?? { minutes: 0, count: 0 };
        cur.minutes += l.duration_minutes ?? 0;
        cur.count += 1;
        m.set(k, cur);
      }
      const rows = Array.from(m.entries())
        .map(([k, v]) => ({ key: k, ...v }))
        .sort((a, b) => a.key.localeCompare(b.key));
      return { title: "Hours by Month", rows };
    }

    if (groupBy === "user") {
      const m = new Map<number, { minutes: number; count: number }>();
      for (const { l } of filtered) {
        const uid = l.owner_id;
        const cur = m.get(uid) ?? { minutes: 0, count: 0 };
        cur.minutes += l.duration_minutes ?? 0;
        cur.count += 1;
        m.set(uid, cur);
      }
      const rows = Array.from(m.entries())
        .map(([uid, v]) => ({
          key: usersById.get(uid)?.name ?? `User ${uid}`,
          ...v,
        }))
        .sort((a, b) => b.minutes - a.minutes);
      return { title: "Hours by User", rows };
    }

    // groupBy === "skill"
    const m = new Map<number, { minutes: number; count: number }>();
    for (const { l } of filtered) {
      if (!l.skill_ids?.length) continue;
      // rough allocation across skills on that log
      const perSkill = (l.duration_minutes ?? 0) / l.skill_ids.length;
      for (const sid of l.skill_ids) {
        const cur = m.get(sid) ?? { minutes: 0, count: 0 };
        cur.minutes += perSkill;
        cur.count += 1;
        m.set(sid, cur);
      }
    }
    const rows = Array.from(m.entries())
      .map(([sid, v]) => ({
        key: skillsById.get(sid)?.name ?? `Skill ${sid}`,
        ...v,
      }))
      .sort((a, b) => b.minutes - a.minutes)
      .slice(0, 20);
    return { title: "Top Skills (est. hours)", rows };
  }, [filtered, groupBy, usersById, skillsById, today]);

  return (
    <div className="card">
      <div className="cardHeader">
        <div>
          <div className="cardTitle">Reports</div>
          <div className="cardDesc">Filters + rollups (hook-ready for permissions)</div>
        </div>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "flex-end" }}>
          <button className="btn" onClick={() => applyPreset("30d")} disabled={preset === "30d"}>
            30d
          </button>
          <button className="btn" onClick={() => applyPreset("90d")} disabled={preset === "90d"}>
            90d
          </button>
          <button className="btn" onClick={() => applyPreset("365d")} disabled={preset === "365d"}>
            1y
          </button>
          <button className="btn" onClick={() => applyPreset("all")} disabled={preset === "all"}>
            All
          </button>
        </div>
      </div>

      <div className="cardBody" style={{ display: "grid", gap: 14 }}>
        {/* Filters */}
        <div className="card" style={{ background: "rgba(255,255,255,0.04)", boxShadow: "none" }}>
          <div className="cardBody" style={{ paddingTop: 12 }}>
            <div style={{ fontWeight: 800, marginBottom: 10 }}>Filters</div>

            <div style={{ display: "grid", gap: 10 }}>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(12, 1fr)", gap: 10 }}>
                <div style={{ gridColumn: "span 3" }}>
                  <div style={{ fontSize: 12, color: "var(--muted)" }}>Start</div>
                  <input
                    className="input"
                    type="date"
                    value={startDate}
                    onChange={(e) => {
                      setPreset("all");
                      setStartDate(e.target.value);
                    }}
                  />
                </div>

                <div style={{ gridColumn: "span 3" }}>
                  <div style={{ fontSize: 12, color: "var(--muted)" }}>End</div>
                  <input
                    className="input"
                    type="date"
                    value={endDate}
                    onChange={(e) => {
                      setPreset("all");
                      setEndDate(e.target.value);
                    }}
                  />
                </div>

                <div style={{ gridColumn: "span 2" }}>
                  <div style={{ fontSize: 12, color: "var(--muted)" }}>Kind</div>
                  <select className="input" value={kind} onChange={(e) => setKind(e.target.value as KindFilter)}>
                    <option value="all">All</option>
                    <option value="training">Training</option>
                    <option value="meeting">Meeting</option>
                  </select>
                </div>

                <div style={{ gridColumn: "span 2" }}>
                  <div style={{ fontSize: 12, color: "var(--muted)" }}>Training type</div>
                  <select
                    className="input"
                    value={trainingType}
                    onChange={(e) => setTrainingType(e.target.value as any)}
                    disabled={kind === "meeting"}
                  >
                    <option value="all">All</option>
                    <option value="personal">Personal</option>
                    <option value="probie">Probie</option>
                    <option value="team">Team</option>
                  </select>
                </div>

                <div style={{ gridColumn: "span 2" }}>
                  <div style={{ fontSize: 12, color: "var(--muted)" }}>Meeting type</div>
                  <select
                    className="input"
                    value={meetingType}
                    onChange={(e) => setMeetingType(e.target.value as any)}
                    disabled={kind === "training"}
                  >
                    <option value="all">All</option>
                    <option value="board">Board</option>
                    <option value="team">Team</option>
                  </select>
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(12, 1fr)", gap: 10 }}>
                <div style={{ gridColumn: "span 4" }}>
                  <div style={{ fontSize: 12, color: "var(--muted)" }}>User</div>
                  <select
                    className="input"
                    value={canViewAllUsers ? ownerId : me.id}
                    onChange={(e) => setOwnerId(e.target.value === "all" ? "all" : parseInt(e.target.value, 10))}
                    disabled={!canViewAllUsers}
                  >
                    <option value="all">All users</option>
                    {rosterUsers
                      .slice()
                      .sort((a, b) => a.name.localeCompare(b.name))
                      .map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.name}
                        </option>
                      ))}
                  </select>
                  {!canViewAllUsers ? (
                    <div style={{ fontSize: 12, color: "var(--muted2)", marginTop: 4 }}>
                      Viewing limited by permissions.
                    </div>
                  ) : null}
                </div>

                <div style={{ gridColumn: "span 3" }}>
                  <div style={{ fontSize: 12, color: "var(--muted)" }}>Group by</div>
                  <select className="input" value={groupBy} onChange={(e) => setGroupBy(e.target.value as any)}>
                    <option value="month">Month</option>
                    <option value="user">User</option>
                    <option value="skill">Skill</option>
                  </select>
                </div>

                <div style={{ gridColumn: "span 5", display: "flex", alignItems: "end", justifyContent: "flex-end" }}>
                  <div style={{ fontSize: 12, color: "var(--muted2)" }}>{filtered.length} logs in scope</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* KPIs */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(12, 1fr)", gap: 12 }}>
          <KpiCard title="Total Hours" value={fmtHours(kpis.totalM)} sub={`${kpis.count} logs`} colSpan={3} />
          <KpiCard title="Training Hours" value={fmtHours(kpis.trainingM)} sub="" colSpan={3} />
          <KpiCard title="Meeting Hours" value={fmtHours(kpis.meetingM)} sub="" colSpan={3} />
          <KpiCard title="Unique Skills" value={String(kpis.uniqueSkills)} sub="(training only)" colSpan={3} />
        </div>

        {/* Rollup Table */}
        <div className="card" style={{ background: "rgba(255,255,255,0.04)", boxShadow: "none" }}>
          <div className="cardBody" style={{ paddingTop: 12 }}>
            <div style={{ fontWeight: 800, marginBottom: 10 }}>{grouped.title}</div>

            {grouped.rows.length === 0 ? (
              <div style={{ color: "var(--muted2)", fontSize: 13 }}>No data in range.</div>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                  <thead>
                    <tr style={{ color: "var(--muted)", textAlign: "left" }}>
                      <th style={{ padding: "8px 6px" }}>Group</th>
                      <th style={{ padding: "8px 6px" }}>Hours</th>
                      <th style={{ padding: "8px 6px" }}>Logs</th>
                    </tr>
                  </thead>
                  <tbody>
                    {grouped.rows.map((r) => (
                      <tr key={r.key} style={{ borderTop: "1px solid var(--border)" }}>
                        <td style={{ padding: "10px 6px", fontWeight: 650 }}>{r.key}</td>
                        <td style={{ padding: "10px 6px" }}>{fmtHours(r.minutes)}</td>
                        <td style={{ padding: "10px 6px", color: "var(--muted2)" }}>{r.count}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Recent list */}
        <div className="card" style={{ background: "rgba(255,255,255,0.04)", boxShadow: "none" }}>
          <div className="cardBody" style={{ paddingTop: 12 }}>
            <div style={{ fontWeight: 800, marginBottom: 10 }}>Most Recent (filtered)</div>

            {filtered.slice(0, 8).map(({ l, when }) => (
              <div
                key={l.id}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  gap: 10,
                  padding: "10px 6px",
                  borderTop: "1px solid var(--border)",
                }}
              >
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 750, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {l.kind === "meeting" ? l.title || "Meeting" : "Training"}
                  </div>
                  <div style={{ fontSize: 12, color: "var(--muted2)", marginTop: 2 }}>
                    {usersById.get(l.owner_id)?.name ?? `User ${l.owner_id}`} · {l.kind} · {fmtHours(l.duration_minutes)}
                  </div>
                </div>

                <div style={{ fontSize: 12, color: "var(--muted2)", whiteSpace: "nowrap" }}>
                  {when ? when.toLocaleDateString() : "—"}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function KpiCard({
  title,
  value,
  sub,
  colSpan,
}: {
  title: string;
  value: string;
  sub: string;
  colSpan: number;
}) {
  return (
    <div
      className="card"
      style={{
        gridColumn: `span ${colSpan}`,
        background: "rgba(255,255,255,0.04)",
        boxShadow: "none",
      }}
    >
      <div className="cardBody" style={{ paddingTop: 12 }}>
        <div style={{ fontSize: 12, color: "var(--muted)", fontWeight: 700 }}>{title}</div>
        <div style={{ fontSize: 28, fontWeight: 900, marginTop: 6 }}>{value}</div>
        {sub ? <div style={{ fontSize: 12, color: "var(--muted2)", marginTop: 4 }}>{sub}</div> : null}
      </div>
    </div>
  );
}
