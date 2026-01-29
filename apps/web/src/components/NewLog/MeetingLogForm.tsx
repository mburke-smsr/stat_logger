import React, { useEffect, useState } from "react";
import { apiFetch } from "../../api";
import type { Me, User } from "../../types";
import { toLocalDatetimeInputValue } from "../../utils/time";
import ParticipantChips from "./ParticipantChips";

type MeetingType = "board" | "team";

type Props = {
  me: Me;
  rosterUsers: User[];
  onBack: () => void;
  onSubmitted: () => Promise<void>;
};

export default function MeetingLogForm({ me, rosterUsers, onBack, onSubmitted }: Props) {
  const [meetingType, setMeetingType] = useState<MeetingType>("team");
  const [startsAt, setStartsAt] = useState(() => toLocalDatetimeInputValue(new Date()));
  const [durationMinutes, setDurationMinutes] = useState<number>(60);
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("general");
  const [notes, setNotes] = useState("");
  const [participantIds, setParticipantIds] = useState<number[]>([me.id]);

  useEffect(() => {
    if (!participantIds.includes(me.id)) {
      setParticipantIds((prev) => (prev.includes(me.id) ? prev : [...prev, me.id]));
    }
  }, [me.id, participantIds]);

  async function submit() {
    const payload = {
      meeting_type: meetingType,
      starts_at: new Date(startsAt).toISOString(),
      duration_minutes: durationMinutes,
      participant_user_ids: participantIds,
      title,
      meeting_category: meetingType === "team" ? category : "",
      notes,
    };

    await apiFetch("/logs/meeting", { method: "POST", body: JSON.stringify(payload) });

    setTitle("");
    setNotes("");
    await onSubmitted();
    onBack();
  }

  return (
    <div style={{ display: "grid", gap: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
        <div style={{ fontWeight: 700 }}>Meeting</div>
        <button onClick={onBack} style={{ padding: 8, cursor: "pointer" }}>
          Back
        </button>
      </div>

      <label style={{ display: "grid", gap: 6 }}>
        Meeting Type
        <select value={meetingType} onChange={(e) => setMeetingType(e.target.value as MeetingType)} style={{ padding: 10, maxWidth: 320 }}>
          <option value="board">Board of Directors</option>
          <option value="team">Team Meeting</option>
        </select>
      </label>

      {meetingType === "team" ? (
        <label style={{ display: "grid", gap: 6 }}>
          Meeting Category
          <select value={category} onChange={(e) => setCategory(e.target.value)} style={{ padding: 10, maxWidth: 320 }}>
            <option value="general">General</option>
            <option value="ops">Operations</option>
            <option value="training">Training</option>
            <option value="logistics">Logistics</option>
          </select>
        </label>
      ) : null}

      <label style={{ display: "grid", gap: 6 }}>
        Topic (optional)
        <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g., Team updates, Budget review" style={{ width: "100%", padding: 10 }} />
      </label>

      <label style={{ display: "grid", gap: 6 }}>
        Start
        <input type="datetime-local" value={startsAt} onChange={(e) => setStartsAt(e.target.value)} style={{ width: 260, padding: 10 }} />
      </label>

      <label style={{ display: "grid", gap: 6 }}>
        Duration (minutes)
        <input type="number" min={1} max={1440} value={durationMinutes} onChange={(e) => setDurationMinutes(Number(e.target.value))} style={{ width: 200, padding: 10 }} />
      </label>

      <ParticipantChips
        meId={me.id}
        users={rosterUsers ?? []}
        participantIds={participantIds}
        setParticipantIds={setParticipantIds}
        title="Attendees (tap to add/remove)"
      />

      <label style={{ display: "grid", gap: 6 }}>
        Notes (optional)
        <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} style={{ width: "100%", padding: 10 }} placeholder="Decisions, action items, quick summary..." />
      </label>

      <button onClick={submit} style={{ padding: 12, cursor: "pointer" }}>
        Submit Meeting Log
      </button>
    </div>
  );
}
