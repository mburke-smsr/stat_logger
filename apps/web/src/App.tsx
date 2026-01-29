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
import GlobalNotices from "./components/GlobalNotices";

// Keep this aligned with LeftNav/AppShell NavKey
type PageKey = "new-log" | "recent-logs" | "reports" | "admin";

const LAST_PAGE_KEY = "sar:lastPage";

function mapToRecord<K extends string | number, V>(m: any): Record<any, V> {
  if (!m) return {};
  if (typeof m === "object" && !m.entries) return m as Record<any, V>;
  try {
    return Object.fromEntries(m.entries()) as Record<any, V>;
  } catch {
    return {};
  }
}

function loadLastPage(): PageKey {
  try {
    const raw = localStorage.getItem(LAST_PAGE_KEY);
    if (raw === "new-log" || raw === "recent-logs" || raw === "reports" || raw === "admin") {
      return raw;
    }
  } catch {
    // ignore (private mode, etc.)
  }
  // Mobile-first default: logs
  return "recent-logs";
}

function saveLastPage(page: PageKey) {
  try {
    localStorage.setItem(LAST_PAGE_KEY, page);
  } catch {
    // ignore
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
  } = useAppData();

  // ✅ Mobile-friendly: remember last section (and default to recent logs)
  const [page, setPage] = useState<PageKey>(() => loadLastPage());

  useEffect(() => {
    (async () => {
      try {
        await refreshAll();
      } catch {
        // not logged in
      }
    })();
  }, [refreshAll]);

  // Persist page for "app" feel (drawer/bottom nav)
  useEffect(() => {
    saveLastPage(page);
  }, [page]);

  // Optional: bounce non-admins away from admin page
  useEffect(() => {
    if (page === "admin" && me && me.permission_level !== "admin") {
      setPage("recent-logs");
    }
  }, [page, me]);

  async function logout() {
    await apiFetch("/auth/logout", { method: "POST" });
    clearAll();
    setPage("recent-logs");
  }

  // Always computed (hook-safe)
  const usersByIdRecord = useMemo(() => mapToRecord<number, User>(usersById), [usersById]);

  // Main content driven by page
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
                canViewAllUsers={true} // for now, everyone sees everyone
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
              <AdminUsersPanel />
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
    allLogs,
    usersByIdRecord,
    rosterUsers,
    events,
    setEvents,
    skillsByCategory,
    refreshAll,
    skills,
  ]);


  const mainWithNotices = (
  <>
    <GlobalNotices onRetryGlobal={refreshAll} />
    {main}
  </>
);


  // ✅ Critical: login gate AFTER hooks (you already do this right)
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
      main={mainWithNotices}
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
