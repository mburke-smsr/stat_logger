import { useCallback, useMemo, useState } from "react";
import { apiFetch } from "../api";
import type { Event, Me, Skill, LogOut, User } from "../types";

export function useAppData() {
  const [me, setMe] = useState<Me | null>(null);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [myLogs, setMyLogs] = useState<LogOut[]>([]);
  const [rosterUsers, setRosterUsers] = useState<User[]>([]);
  const [allLogs, setAllLogs] = useState<LogOut[]>([]);

  const skillsByCategory = useMemo(() => {
    const map = new Map<string, Skill[]>();
    for (const s of skills) {
      const arr = map.get(s.category) ?? [];
      arr.push(s);
      map.set(s.category, arr);
    }
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [skills]);

  const rosterUsersById  = useMemo(() => {
    const m = new Map<number, User>();
    for (const u of rosterUsers) m.set(u.id, u);
    return m;
  }, [rosterUsers]);

  const usersById = useMemo(() => {
    const m = new Map<number, User>();
    for (const u of users) m.set(u.id, u);
    return m;
  }, [users]);

  const refreshAll = useCallback(async () => {
    // 1) Always get current user first
    const meResp = (await apiFetch("/me")) as Me;
    setMe(meResp);

    // 2) Fetch member-safe data in parallel
    const [skillsResp, eventsResp, rosterResp, logsResp] = await Promise.all([
      apiFetch("/skills"),
      apiFetch("/events?days=30"),
      apiFetch("/users/roster"),
      apiFetch("/logs/mine?limit=50"),
    ]);

    setSkills(skillsResp as Skill[]);
    setEvents(eventsResp as Event[]);
    setRosterUsers(rosterResp as User[]);
    setMyLogs(logsResp as LogOut[]);
    try {
      const allLogsResp = await apiFetch("/logs/recent?limit=500");
      setAllLogs(allLogsResp as LogOut[]);
    } catch {
      setAllLogs(logsResp as LogOut[]);
    }

    // 3) Only admins can fetch roster/users
    //if (meResp.permission_level === "admin") {
    //  const usersResp = await apiFetch("/users");
    //  setUsers(usersResp as User[]);
    //} else {
    //  setUsers([]); // members don't get roster
    //}


  }, []);

  const clearAll = useCallback(() => {
    setMe(null);
    setSkills([]);
    setEvents([]);
    setUsers([]);
    setRosterUsers([]);
    setMyLogs([]);
  }, []);

  return {
    me,
    setMe,
    skills,
    events,
    rosterUsers,
    myLogs,
    allLogs,
    skillsByCategory,
    rosterUsersById ,
    usersById ,
    refreshAll,
    clearAll,
    setEvents, // used for "create tonight event" UI helper
  };
}
