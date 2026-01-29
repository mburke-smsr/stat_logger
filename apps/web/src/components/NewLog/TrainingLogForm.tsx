import React, { useMemo, useState } from "react";
import { apiFetch } from "../../api";
import type { Event, Me, Skill, User } from "../../types";
import { toLocalDatetimeInputValue } from "../../utils/time";
import ParticipantChips from "./ParticipantChips";
import SkillChipsByCategory from "./SkillChipsByCategory";

type TrainingType = "personal" | "probie" | "team";

type Props = {
  me: Me;
  rosterUsers: User[];
  events: Event[];
  setEvents: (fn: (prev: Event[]) => Event[]) => void;
  skillsByCategory: Array<[string, Skill[]]>;
  onBack: () => void;
  onSubmitted: () => Promise<void>;
};

export default function TrainingLogForm({ me, rosterUsers, events, setEvents, skillsByCategory, onBack, onSubmitted }: Props) {
  const [trainingType, setTrainingType] = useState<TrainingType>("team");
  const [eventId, setEventId] = useState<number | "none">("none");
  const [startsAt, setStartsAt] = useState(() => toLocalDatetimeInputValue(new Date()));
  const [durationMinutes, setDurationMinutes] = useState<number>(180);
  const [selectedSkillIds, setSelectedSkillIds] = useState<number[]>([]);
  const [notes, setNotes] = useState("");
  const [participantIds, setParticipantIds] = useState<number[]>([me.id]);

  // Always ensure me is included (even if users list refreshes)
  useMemo(() => {
    if (!participantIds.includes(me.id)) setParticipantIds([...participantIds, me.id]);
  }, [me.id, participantIds]);

  async function createTonightEvent() {
    const now = new Date();
    const start = new Date(now);
    start.setHours(19, 0, 0, 0);
    const end = new Date(now);
    end.setHours(22, 0, 0, 0);

    const created = await apiFetch("/events", {
      method: "POST",
      body: JSON.stringify({
        title: "Team Training",
        location: "",
        event_type: "training",
        starts_at: start.toISOString(),
        ends_at: end.toISOString(),
        notes: "",
      }),
    });

    const e = created as Event;
    setEvents((prev) => [e, ...prev]);
    setEventId(e.id);
  }

  async function submit() {
    const payload = {
      training_type: trainingType,
      event_id: eventId === "none" ? null : eventId,
      starts_at: new Date(startsAt).toISOString(),
      duration_minutes: durationMinutes,
      participant_user_ids: participantIds,
      skill_ids: selectedSkillIds,
      notes,
    };

    await apiFetch("/logs/training", { method: "POST", body: JSON.stringify(payload) });

    // reset lightweight
    setSelectedSkillIds([]);
    setNotes("");
    await onSubmitted();
    onBack();
  }

  return (
    <div style={{ display: "grid", gap: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
        <div style={{ fontWeight: 700 }}>Training</div>
        <button onClick={onBack} style={{ padding: 8, cursor: "pointer" }}>
          Back
        </button>
      </div>

      <label style={{ display: "grid", gap: 6 }}>
        Training Type
        <select value={trainingType} onChange={(e) => setTrainingType(e.target.value as TrainingType)} style={{ padding: 10, maxWidth: 320 }}>
          <option value="personal">Personal</option>
          <option value="probie">Probie</option>
          <option value="team">Team</option>
        </select>
      </label>

      <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
        <label style={{ display: "grid", gap: 6 }}>
          Event (optional)
          <select
            value={eventId}
            onChange={(e) => {
              const v = e.target.value;
              setEventId(v === "none" ? "none" : Number(v));
            }}
            style={{ padding: 10, minWidth: 320 }}
          >
            <option value="none">(No event / ad hoc)</option>
            {events.map((e) => (
              <option key={e.id} value={e.id}>
                {new Date(e.starts_at).toLocaleDateString()} — {e.title}
              </option>
            ))}
          </select>
        </label>

        <button onClick={createTonightEvent} style={{ padding: 10, cursor: "pointer", height: 40, alignSelf: "end" }}>
          + Create “Tonight” Event
        </button>
      </div>

      <label style={{ display: "grid", gap: 6 }}>
        Start
        <input type="datetime-local" value={startsAt} onChange={(e) => setStartsAt(e.target.value)} style={{ width: 260, padding: 10 }} />
      </label>

      <label style={{ display: "grid", gap: 6 }}>
        Duration (minutes)
        <input type="number" min={1} max={1440} value={durationMinutes} onChange={(e) => setDurationMinutes(Number(e.target.value))} style={{ width: 200, padding: 10 }} />
      </label>

      <div style={{ fontSize: 12, color: "#666" }}>Roster users loaded: {rosterUsers?.length ?? 0}</div>

      {!me ? (
        <div>Loading roster…</div>
      ) : (
        <ParticipantChips
          meId={me.id}
          users={rosterUsers ?? []}
          participantIds={participantIds}
          setParticipantIds={setParticipantIds}
          title="Roster (tap to add/remove)"
        />
      )}

      <SkillChipsByCategory skillsByCategory={skillsByCategory} selectedSkillIds={selectedSkillIds} setSelectedSkillIds={setSelectedSkillIds} />

      <label style={{ display: "grid", gap: 6 }}>
        Notes (optional)
        <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} style={{ width: "100%", padding: 10 }} placeholder="Quick notes, instructors, systems practiced..." />
      </label>

      <button onClick={submit} style={{ padding: 12, cursor: "pointer" }}>
        Submit Training Log
      </button>
    </div>
  );
}
