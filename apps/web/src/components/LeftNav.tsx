import React from "react";
import type { Skill } from "../types";

export type NavKey = "new-log" | "recent-logs" | "reports" | "admin";

type Props = {
  skillsByCategory: Array<[string, Skill[]]>;
  active: NavKey;
  onNavigate: (key: NavKey) => void;
  isAdmin?: boolean;
};

export default function LeftNav({ skillsByCategory, active, onNavigate, isAdmin }: Props) {
  function navItem(label: string, key: NavKey, right?: React.ReactNode, disabled?: boolean) {
    const cls = key === active ? "navItem navItemActive" : "navItem";
    return (
      <a
        href="#"
        className={cls}
        onClick={(e) => {
          e.preventDefault();
          if (disabled) return;
          onNavigate(key);
        }}
        style={disabled ? { opacity: 0.55, cursor: "not-allowed" } : undefined}
      >
        <span style={{ fontWeight: 650 }}>{label}</span>
        {right}
      </a>
    );
  }

  return (
    <div className="card">
      <div className="nav">
        <div className="navGroupTitle">Workspace</div>
        {navItem("New Log", "new-log")}
        {navItem("Recent Logs", "recent-logs")}
        {navItem("Reports", "reports")}
        {isAdmin ? navItem("Admin", "admin") : navItem("Admin", "admin", <span className="pill">Admin</span>, true)}

        <hr className="hr" />

        <div className="navGroupTitle">Skills</div>

        <div style={{ display: "grid", gap: 6 }}>
          {skillsByCategory.map(([cat, skills]) => (
            <div key={cat} className="navItem" style={{ cursor: "default" }}>
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
