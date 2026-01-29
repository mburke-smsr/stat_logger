import React, { useEffect, useMemo, useState } from "react";
import { apiFetch } from "./api";
import AppShell from "./components/AppShell";
import LoginPage from "./pages/LoginPage";

import NewLogPanel from "./components/NewLog/NewLogPanel";
import RecentLogs from "./components/RecentLogs";
import ReportsPanel from "./components/ReportsPanel";
import AdminUsersPanel from "./components/AdminUsersPanel";
import RightPanel from "./components/RightPanel";

import { useAppData } from "./hooks/useAppData";
import type { User } from "./types";

// Keep this aligned with LeftNav/AppShell NavKey
type PageKey = "new-log" | "recent-logs" | "reports" | "admin";

function mapToRecord<K extends string | number, V>(m: any): Record<any, V> {
  if (!m) return {};
  if (typeof m === "object" && !m.entries) return m as Record<any, V>;
  try {
    return Object.fromEntries(m.entries()) as Record<any, V>;
  } catch {
    return {};
  }
}

export default function App() {
  const {
    me,
    skills,
    events,
    rosterUsers,
    myLogs,
    allLogs,
    skillsByCategory,
    usersById,
    refreshAll,
    clearAll,
    setEvents,
    // if you have `users` separately, wire AdminUsersPanel to it later
    // users,
  } = useAppData();

  const [page, setPage] = useState<PageKey>("new-log");

  useEffect(() => {
    (async () => {
      try {
        await refreshAll();
      } catch {
        // not logged in
      }
    })();
  }, [refreshAll]);

  // Optional: bounce non-admins away from admin page
  useEffect(() => {
    if (page === "admin" && me && me.permission_level !== "admin") {
      setPage("new-log");
    }
  }, [page, me]);

  async function logout() {
    await apiFetch("/auth/logout", { method: "POST" });
    clearAll();
    setPage("new-log");
  }

  // Always computed (hook-safe)
  const usersByIdRecord = useMemo(() => mapToRecord<number, User>(usersById), [usersById]);

  // ✅ THIS is the “main is driven by page” part:
  // `main` is a ReactNode that changes based on `page`
  const main = useMemo(() => {
    if (!me) return null;

    switch (page) {
      case "recent-logs":
        return (
          <RecentLogs
            me={me}
            logs={myLogs as any}
            usersById={usersByIdRecord as any}
            onChanged={refreshAll}
          />
        );

      case "reports":
        return (
          <div className="card">
            <div className="cardHeader">
              <div>
                <div className="cardTitle">Reports</div>
                <div className="cardDesc">Tracking Report</div>
              </div>
            </div>
            <div className="cardBody">
              <ReportsPanel
                me={me}
                logs={allLogs.length ? allLogs : myLogs}
                rosterUsers={rosterUsers}
                skills={skills}
                canViewAllUsers={true} // ✅ for now, everyone sees everyone
              />
            </div>
          </div>
        );

      case "admin":
        return (
          <div className="card">
            <div className="cardHeader">
              <div>
                <div className="cardTitle">Admin</div>
                <div className="cardDesc">User management</div>
              </div>
            </div>
            <div className="cardBody">
              <AdminUsersPanel users={rosterUsers as any} />
            </div>
          </div>
        );

      case "new-log":
      default:
        return (
          <div className="card">
            <div className="cardHeader">
              <div>
                <div className="cardTitle">New Log</div>
                <div className="cardDesc">Record training or meetings.</div>
              </div>
            </div>
            <div className="cardBody">
              <NewLogPanel
                me={me}
                rosterUsers={rosterUsers}
                events={events}
                setEvents={setEvents}
                skillsByCategory={skillsByCategory}
                onSubmitted={refreshAll}
              />
            </div>
          </div>
        );
    }
  }, [
    me,
    page,
    myLogs,
    usersByIdRecord,
    rosterUsers,
    events,
    setEvents,
    skillsByCategory,
    refreshAll,
  ]);

  // Safe conditional return AFTER hooks
  if (!me) {
    return <LoginPage onLoggedIn={refreshAll} />;
  }

  return (
    <AppShell
      me={me}
      onLogout={logout}
      skillsByCategory={skillsByCategory}
      activeNav={page}
      onNavigate={(k) => setPage(k as PageKey)}
      main={main}
      right={
        <RightPanel
          me={me}
          myLogs={myLogs as any}
          usersById={usersByIdRecord as any}
          skills={skills}
        />
      }
    />
  );
}
