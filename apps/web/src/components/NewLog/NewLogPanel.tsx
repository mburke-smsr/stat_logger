import React, { useState } from "react";
import type { Event, Me, Skill, User } from "../../types";
import KindSelector, { LogKind } from "./KindSelector";
import TrainingLogForm from "./TrainingLogForm";
import MeetingLogForm from "./MeetingLogForm";

type Props = {
  me: Me;
  rosterUsers: User[];
  events: Event[];
  setEvents: (fn: (prev: Event[]) => Event[]) => void;
  skillsByCategory: Array<[string, Skill[]]>;
  onSubmitted: () => Promise<void>;
};

export default function NewLogPanel({ me, rosterUsers, events, setEvents, skillsByCategory, onSubmitted }: Props) {
  const [kind, setKind] = useState<LogKind | null>(null);

  if (kind === null) return <KindSelector onPick={setKind} />;

  if (kind === "training") {
    return (
      <TrainingLogForm
        me={me}
        rosterUsers={rosterUsers}
        events={events}
        setEvents={setEvents}
        skillsByCategory={skillsByCategory}
        onBack={() => setKind(null)}
        onSubmitted={onSubmitted}
      />
    );
  }

  return (
    <MeetingLogForm
      me={me}
      rosterUsers={rosterUsers}
      onBack={() => setKind(null)}
      onSubmitted={onSubmitted}
    />
  );
}
