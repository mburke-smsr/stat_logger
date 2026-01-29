import React from "react";
import type { Me } from "../types";

type Props = {
  me: Me;
  onLogout: () => void | Promise<void>;
  onOpenNav?: () => void;
};

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const a = parts[0]?.[0] ?? "?";
  const b = parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? "") : "";
  return (a + b).toUpperCase();
}

export default function TopBar({ me, onLogout, onOpenNav }: Props) {
  return (
    <div className="topBar">
      <div className="topBarInner">
        <div className="brand">
          <button className="btn mobileNavBtn" onClick={onOpenNav} aria-label="Open navigation">
            ☰
          </button>

          <div className="brandMark" aria-hidden="true" />
          <div>
            <div className="brandTitle">SMSR Training Log</div>
            <div className="brandSubtitle">Skills • Logs • Currency</div>
          </div>

          <span className="pill" style={{ marginLeft: 10 }}>
            {me.permission_level.toUpperCase()}
          </span>
        </div>

        <div className="kbdSearch">
          <input className="input" placeholder="Search (next): logs, skills, people…" disabled />
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 13, fontWeight: 650, lineHeight: 1.1 }}>{me.name}</div>
            <div style={{ fontSize: 12, color: "var(--muted2)", marginTop: 3 }}>{me.email}</div>
          </div>

          <div className="avatar" title={me.name}>
            {initials(me.name)}
          </div>

          <button className="btn" onClick={onLogout}>
            Logout
          </button>
        </div>
      </div>
    </div>
  );
}
