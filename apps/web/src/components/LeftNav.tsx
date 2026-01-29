import React from "react";
import type { Skill } from "../types";

export type NavKey = "new-log" | "recent-logs" | "reports" | "admin";

type Props = {
  skillsByCategory: Array<[string, Skill[]]>;
  active: NavKey;
  onNavigate: (key: NavKey) => void;
  isAdmin?: boolean;
};

export default function LeftNav({
  skillsByCategory,
  active,
  onNavigate,
  isAdmin = false,
}: Props) {
  function NavButton({
    label,
    navKey,
    right,
  }: {
    label: string;
    navKey: NavKey;
    right?: React.ReactNode;
  }) {
    const isActive = navKey === active;
    const cls = isActive ? "navItem navItemActive" : "navItem";

    return (
      <button
        type="button"
        className={cls}
        onClick={() => onNavigate(navKey)}
        aria-current={isActive ? "page" : undefined}
      >
        <span style={{ fontWeight: 650 }}>{label}</span>
        {right}
      </button>
    );
  }

  return (
    <div className="card">
      <div className="nav">
        <div className="navGroupTitle">Workspace</div>

        <NavButton label="New Log" navKey="new-log" />
        <NavButton label="Recent Logs" navKey="recent-logs" />
        <NavButton label="Reports" navKey="reports" />

        {isAdmin ? <NavButton label="Admin" navKey="admin" /> : null}

        <hr className="hr" />

        <div className="navGroupTitle">Skills</div>

        <div style={{ display: "grid", gap: 6 }}>
          {skillsByCategory.map(([cat, skills]) => (
            <div
              key={cat}
              className="navSkillRow"
              title={`${skills.length} skills`}
            >
              <span style={{ fontSize: 13 }}>{cat}</span>
              <span className="pill">{skills.length}</span>
            </div>
          ))}
        </div>

        {skillsByCategory.length === 0 ? (
          <div style={{ marginTop: 10, color: "var(--muted2)", fontSize: 13 }}>
            No skills loaded yet.
          </div>
        ) : null}
      </div>
    </div>
  );
}
