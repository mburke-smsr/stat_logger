import React, { useMemo, useState } from "react";
import type { Me, Skill } from "../types";
import TopBar from "./TopBar";
import LeftNav, { NavKey } from "./LeftNav";

type Props = {
  me: Me;
  onLogout: () => void | Promise<void>;
  skillsByCategory: Array<[string, Skill[]]>;

  activeNav: NavKey;
  onNavigate?: (key: "new-log" | "recent-logs" | "reports" | "admin") => void;

  main: React.ReactNode;
  right?: React.ReactNode;
};


export default function AppShell({
  me,
  onLogout,
  skillsByCategory,
  activeNav,
  onNavigate,
  main,
  right,
}: Props) {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const isAdmin = me.permission_level === "admin";

  const nav = useMemo(
    () => (
      <LeftNav
        skillsByCategory={skillsByCategory}
        active={activeNav}
        isAdmin={isAdmin}
        onNavigate={(k) => {
          // hard safety: ignore admin nav for non-admins
          if (k === "admin" && !isAdmin) return;

          onNavigate?.(k);
          setMobileNavOpen(false); // close drawer on mobile
        }}
      />
    ),
    [skillsByCategory, activeNav, onNavigate, isAdmin]
  );

  return (
    <>
      <TopBar me={me} onLogout={onLogout} onOpenNav={() => setMobileNavOpen(true)} />

      {mobileNavOpen ? (
        <>
          <div className="drawerOverlay" onClick={() => setMobileNavOpen(false)} />
          <div className="drawer" role="dialog" aria-modal="true" aria-label="Navigation">
            <div className="drawerHeader">
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div className="brandMark" />
                <div>
                  <div style={{ fontWeight: 800 }}>SMSR</div>
                  <div style={{ fontSize: 12, color: "var(--muted2)" }}>Training Log</div>
                </div>
              </div>
              <button className="btn" onClick={() => setMobileNavOpen(false)}>
                ✕
              </button>
            </div>
            {nav}
          </div>
        </>
      ) : null}

      <div className="shell">
        <div className="leftRail">{nav}</div>
        <div className="section">{main}</div>
        <div className="rightRail">{right ? <div className="section">{right}</div> : null}</div>
      </div>
    </>
  );
}
