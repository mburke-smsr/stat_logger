export type Me = {
  id: number;
  email: string;
  name: string;

  permission_level: "admin" | "member";
  team_status_level: "probationary" | "loa" | "regular" | "specialist" | "associate";

  emt_id: number | null;
  emt_instructor_id: number | null;
  cpr_aed_id: number | null;
};

export type User = {
  id: number;
  email: string;
  name: string;

  permission_level: "admin" | "member";
  team_status_level: "probationary" | "loa" | "regular" | "specialist" | "associate";

  emt_id: number | null;
  emt_instructor_id: number | null;
  cpr_aed_id: number | null;
};

export type Skill = {
  id: number;
  name: string;
  category: string;
};

export type Event = {
  id: number;
  title: string;
  location: string;
  event_type: string;
  starts_at: string;
  ends_at: string;
  notes: string;
};

export type LogOut = {
  id: number;
  kind: string; // "training" | "meeting"
  training_type: string | null; // "personal" | "probie" | "team"
  meeting_type: string | null;  // "board" | "team"
  title: string | null;
  meeting_category: string | null;
  event_id: number | null;
  owner_id: number;
  duration_minutes: number;
  notes: string;
  created_at: string;
  skill_ids: number[];
  participant_user_ids: number[];
};
