import React, { useMemo } from "react";
import type { LogOut, Me, Skill, User } from "../types";

type Props = {
  me: Me;
  myLogs: LogOut[];
  usersById: Record<number, User>;
  skills: Skill[];
};

function safeDate(raw: any): Date | null {
  if (!raw) return null;
  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? null : d;
}

function logWhen(log: LogOut): Date | null {
  // Some backends include starts_at even if types.ts doesn't.
  return safeDate((log as any).starts_at) || safeDate((log as any).startsAt) || safeDate(log.created_at) || null;
}

function fmtHoursFromMinutes(mins: number): string {
  const h = (mins ?? 0) / 60;
  if (!Number.isFinite(h)) return "—";
  const rounded = Math.round(h * 10) / 10; // 0.1h precision
  // Show 0h as "0h" (or "—" if you prefer)
  return `${rounded}h`;
}

function titleForLog(log: LogOut): string {
  if (log.kind === "meeting") {
    return log.title?.trim() || (log.meeting_type ? `${log.meeting_type} meeting` : "Meeting");
  }
  // training
  return log.training_type ? `${log.training_type} training` : "Training";
}

export default function RightPanel({ me, myLogs, usersById, skills }: Props) {
  const skillsById = useMemo(() => {
    const m = new Map<number, Skill>();
    for (const s of skills) m.set(s.id, s);
    return m;
  }, [skills]);

  const stats = useMemo(() => {
    const totalLogs = myLogs.length;

    let totalMinutes = 0;
    const uniqueSkillIds = new Set<number>();

    for (const l of myLogs) {
      totalMinutes += l.duration_minutes ?? 0;
      for (const sid of l.skill_ids ?? []) uniqueSkillIds.add(sid);
    }

    return {
      totalLogs,
      totalMinutes,
      uniqueSkills: uniqueSkillIds.size,
    };
  }, [myLogs]);

  const recent = useMemo(() => {
    return myLogs
      .map((l) => ({ l, when: logWhen(l) }))
      .sort((a, b) => (b.when?.getTime() ?? 0) - (a.when?.getTime() ?? 0))
      .slice(0, 6);
  }, [myLogs]);

  const topSkills = useMemo(() => {
    // Top skills by minutes in the last 90 days (rough allocation per log)
    const now = new Date();
    const cutoff = new Date(now);
    cutoff.setDate(cutoff.getDate() - 90);

    const agg = new Map<number, number>(); // skillId -> minutes
    for (const log of myLogs) {
      const when = logWhen(log);
      if (!when || when < cutoff) continue;

      const sids = log.skill_ids ?? [];
      if (sids.length === 0) continue;

      const perSkill = (log.duration_minutes ?? 0) / sids.length;
      for (const sid of sids) agg.set(sid, (agg.get(sid) ?? 0) + perSkill);
    }

    return Array.from(agg.entries())
      .map(([sid, minutes]) => ({
        sid,
        name: skillsById.get(sid)?.name ?? `Skill ${sid}`,
        minutes,
      }))
      .sort((a, b) => b.minutes - a.minutes)
      .slice(0, 6);
  }, [myLogs, skillsById]);

  return (
    <>
      <div className="card">
        <div className="cardHeader">
          <div>
            <div className="cardTitle">Your Overview</div>
            <div className="cardDesc">Personal training snapshot</div>
          </div>
        </div>

        <div className="cardBody">
          <div className="section" style={{ display: "grid", gap: 10 }}>
            <Stat label="Logs Recorded" value={stats.totalLogs} />
            <Stat label="Total Hours" value={fmtHoursFromMinutes(stats.totalMinutes)} />
            <Stat label="Skills Practiced" value={stats.uniqueSkills} />
            <Stat label="Account Role" value={me.permission_level} />
          </div>
        </div>
      </div>

      <div className="card">
        <div className="cardHeader">
          <div>
            <div className="cardTitle">Recent Activity</div>
            <div className="cardDesc">Last few entries</div>
          </div>
        </div>

        <div className="cardBody">
          <div className="section" style={{ display: "grid", gap: 10 }}>
            {recent.length === 0 ? (
              <div style={{ color: "var(--muted2)", fontSize: 13 }}>No logs yet.</div>
            ) : (
              recent.map(({ l, when }) => {
                const owner = usersById?.[l.owner_id]?.name ?? "Unknown";
                return (
                  <div
                    key={l.id}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      gap: 10,
                      fontSize: 13,
                      borderTop: "1px solid var(--border)",
                      paddingTop: 10,
                    }}
                  >
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontWeight: 750, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {titleForLog(l)}
                      </div>
                      <div style={{ color: "var(--muted2)", fontSize: 12, marginTop: 2 }}>
                        {owner} · {l.kind} · {fmtHoursFromMinutes(l.duration_minutes)}
                      </div>
                    </div>

                    <div style={{ color: "var(--muted2)", fontSize: 12, whiteSpace: "nowrap" }}>
                      {when ? when.toLocaleDateString() : "—"}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      <div className="card">
        <div className="cardHeader">
          <div>
            <div className="cardTitle">Top Skills</div>
            <div className="cardDesc">Last 90 days (estimated)</div>
          </div>
        </div>

        <div className="cardBody">
          <div className="section" style={{ display: "grid", gap: 10 }}>
            {topSkills.length === 0 ? (
              <div style={{ color: "var(--muted2)", fontSize: 13 }}>
                No skill-tagged logs in the last 90 days.
              </div>
            ) : (
              topSkills.map((s) => (
                <div
                  key={s.sid}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    fontSize: 13,
                    borderTop: "1px solid var(--border)",
                    paddingTop: 10,
                  }}
                >
                  <span style={{ fontWeight: 650 }}>{s.name}</span>
                  <span style={{ color: "var(--muted2)" }}>{fmtHoursFromMinutes(s.minutes)}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </>
  );
}

function Stat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 10, fontSize: 14 }}>
      <span style={{ color: "var(--muted)" }}>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}
