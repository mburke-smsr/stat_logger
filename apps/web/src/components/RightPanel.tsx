import React from "react";
import type { Me, Skill, TrainingLog, User } from "../types";

type Props = {
  me: Me;
  myLogs: TrainingLog[];
  usersById: Record<number, User>;
  skills: Skill[];
};

function formatLogDate(log: any) {
  const raw =
    log.date ??
    log.starts_at ??
    log.startsAt ??
    log.created_at ??
    log.createdAt;

  if (!raw) return "—";

  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleDateString();
}

function formatDuration(log: any) {
  // training logs: hours
  if (typeof log.hours === "number") {
    return `${log.hours}h`;
  }

  // meeting logs: duration_minutes -> hours with 1 decimal if needed
  const mins = log.duration_minutes ?? log.durationMinutes;
  if (typeof mins === "number") {
    const hrs = mins / 60;
    const pretty = Number.isInteger(hrs) ? hrs.toString() : hrs.toFixed(1);
    return `${pretty}h`;
  }

  return "—";
}

function formatKind(log: any) {
  const k = (log.kind ?? "").toString().toLowerCase();
  if (k === "meeting") return "Meeting";
  if (k === "training") return "Training";
  return log.kind ?? "Log";
}

export default function RightPanel({ me, myLogs, usersById, skills }: Props) {
  const totalLogs = myLogs.length;
  const uniqueSkills = new Set(myLogs.flatMap(l => l.skills ?? [])).size;

  const recent = myLogs.slice(0, 5);

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
          <div className="section">
            <Stat label="Logs Recorded" value={totalLogs} />
            <Stat label="Skills Practiced" value={uniqueSkills} />
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
          <div className="section">
            {recent.length === 0 && (
              <div style={{ color: "var(--muted2)", fontSize: 13 }}>
                No logs yet.
              </div>
            )}

            {recent.map(log => (
              <div
                key={log.id}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  gap: 8,
                  fontSize: 13,
                }}
              >
                <span>
                  {formatKind(log)} · {formatDuration(log)}
                </span>
                <span style={{ color: "var(--muted2)" }}>
                   {formatLogDate(log)}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}

function Stat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 14 }}>
      <span style={{ color: "var(--muted)" }}>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}
