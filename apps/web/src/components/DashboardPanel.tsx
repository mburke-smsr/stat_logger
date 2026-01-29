import React, { useEffect, useMemo, useState } from "react";
import { apiFetch } from "../api";
import type { Skill, User } from "../types";
import { formatMinutes } from "../utils/format";

type Props = {
  skills: Skill[];
  usersById: Map<number, User>;
};

type SkillGap = {
  skill_id: number;
  status: "never" | "stale";
  last_trained_at: string | null;
  days_since: number | null;
  stale_after_days: number;
};

type ReportSummary = {
  range_days: number;
  cutoff: string;
  default_stale_days?: number;
  totals: { training_minutes: number; meeting_minutes: number };
  top_skills: Array<{ skill_id: number; minutes: number; sessions?: number }>;
  skill_gaps: SkillGap[];
  member_totals: Array<{
    user_id: number;
    training_minutes: number;
    meeting_minutes: number;
    total_minutes: number;
  }>;
};

function formatDaysSince(days: number | null) {
  if (days === null || Number.isNaN(days)) return "—";
  return `${days}d`;
}

export default function DashboardPanel({ skills, usersById }: Props) {
  const [days, setDays] = useState<number>(90);
  const [data, setData] = useState<ReportSummary | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const skillsById = useMemo(() => {
    const m = new Map<number, Skill>();
    for (const s of skills) m.set(s.id, s);
    return m;
  }, [skills]);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        setErr(null);
        setData(null);
        const resp = (await apiFetch(`/reports/summary?days=${days}`)) as ReportSummary;
        if (!cancelled) setData(resp);
      } catch (e: any) {
        if (!cancelled) setErr(e?.message ?? "Failed to load dashboard");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [days]);

  const training = data?.totals.training_minutes ?? 0;
  const meeting = data?.totals.meeting_minutes ?? 0;

  const neverCount = (data?.skill_gaps ?? []).filter((g) => g.status === "never").length;
  const staleCount = (data?.skill_gaps ?? []).filter((g) => g.status === "stale").length;

  const topGaps = useMemo(() => {
    if (!data) return [];
    const gaps = [...data.skill_gaps];
    gaps.sort((a, b) => {
      if (a.status !== b.status) return a.status === "never" ? -1 : 1;
      const ad = a.days_since ?? -1;
      const bd = b.days_since ?? -1;
      return bd - ad;
    });
    return gaps.slice(0, 5);
  }, [data]);

  return (
    <div className="section">
      <div className="metaRow">
        <div>
          <div style={{ fontWeight: 800, fontSize: 14 }}>Team Dashboard</div>
          <div className="metaSmall">Aggregated across all participants (each attendee receives duration credit).</div>
        </div>

        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <span className="pill">Range</span>
          <select className="input select" value={days} onChange={(e) => setDays(Number(e.target.value))} style={{ width: 150 }}>
            <option value={30}>30 days</option>
            <option value={90}>90 days</option>
            <option value={365}>365 days</option>
          </select>
        </div>
      </div>

      {err ? <div className="pill badgeDanger">{err}</div> : null}
      {!data ? <div className="metaSmall">Loading…</div> : null}

      {data ? (
        <>
          <div className="card" style={{ background: "rgba(255,255,255,0.04)" }}>
            <div className="cardHeader">
              <div>
                <div className="cardTitle">Training gaps</div>
                <div className="cardDesc">
                  Never: <b>{neverCount}</b> • Stale: <b>{staleCount}</b> • Default threshold:{" "}
                  <b>{data.default_stale_days ?? 120} days</b>
                </div>
              </div>
              <span className="pill">Action</span>
            </div>
            <div className="cardBody">
              {topGaps.length === 0 ? (
                <div className="metaSmall" style={{ color: "rgba(255,255,255,0.85)" }}>No gaps 🎉</div>
              ) : (
                <div style={{ display: "grid", gap: 8 }}>
                  {topGaps.map((g) => {
                    const name = skillsById.get(g.skill_id)?.name ?? `#${g.skill_id}`;
                    return (
                      <div key={g.skill_id} className="metaRow">
                        <div style={{ fontWeight: 650 }}>{name}</div>
                        {g.status === "never" ? (
                          <span className="pill badgeDanger">never trained</span>
                        ) : (
                          <span className="pill">
                            {formatDaysSince(g.days_since)} • limit {g.stale_after_days}d
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          <div className="formRow2">
            <div className="card" style={{ background: "rgba(255,255,255,0.04)" }}>
              <div className="cardHeader">
                <div>
                  <div className="cardTitle">Team totals</div>
                  <div className="cardDesc">Training + meetings time in this range.</div>
                </div>
              </div>
              <div className="cardBody">
                <div style={{ display: "grid", gap: 8 }}>
                  <div className="metaRow">
                    <div className="metaSmall">Training</div>
                    <div style={{ fontWeight: 800 }}>{formatMinutes(training)}</div>
                  </div>
                  <div className="metaRow">
                    <div className="metaSmall">Meetings</div>
                    <div style={{ fontWeight: 800 }}>{formatMinutes(meeting)}</div>
                  </div>
                  <div className="metaRow">
                    <div className="metaSmall">Total</div>
                    <div style={{ fontWeight: 800 }}>{formatMinutes(training + meeting)}</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="card" style={{ background: "rgba(255,255,255,0.04)" }}>
              <div className="cardHeader">
                <div>
                  <div className="cardTitle">Top skills</div>
                  <div className="cardDesc">Highest total logged minutes.</div>
                </div>
              </div>
              <div className="cardBody">
                {data.top_skills.length === 0 ? (
                  <div className="metaSmall">(no skills logged)</div>
                ) : (
                  <div style={{ display: "grid", gap: 8 }}>
                    {data.top_skills.slice(0, 8).map((r) => {
                      const name = skillsById.get(r.skill_id)?.name ?? `#${r.skill_id}`;
                      return (
                        <div key={r.skill_id} className="metaRow">
                          <div style={{ fontWeight: 650 }}>{name}</div>
                          <div className="pill">{formatMinutes(r.minutes)}</div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="card" style={{ background: "rgba(255,255,255,0.04)" }}>
            <div className="cardHeader">
              <div>
                <div className="cardTitle">Participation</div>
                <div className="cardDesc">Top 10 by total time.</div>
              </div>
            </div>
            <div className="cardBody">
              {data.member_totals.length === 0 ? (
                <div className="metaSmall">(no participant data)</div>
              ) : (
                <div style={{ display: "grid", gap: 8 }}>
                  {data.member_totals.slice(0, 10).map((m) => {
                    const u = usersById.get(m.user_id);
                    const name = u?.name || u?.email || `#${m.user_id}`;
                    return (
                      <div key={m.user_id} className="metaRow">
                        <div style={{ fontWeight: 650 }}>{name}</div>
                        <div className="pill">{formatMinutes(m.total_minutes)}</div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
