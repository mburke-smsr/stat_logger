import React from "react";
import type { User } from "../../types";

type Props = {
  meId: number;
  users: User[];
  participantIds: number[];
  setParticipantIds: (ids: number[]) => void;
  title: string;
};

export default function ParticipantChips({ meId, users, participantIds, setParticipantIds, title }: Props) {
  function toggle(id: number) {
    if (id === meId) return;
    setParticipantIds(participantIds.includes(id) ? participantIds.filter((x) => x !== id) : [...participantIds, id]);
  }

  return (
    <div>
      <div style={{ marginBottom: 8, display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <div>{title}</div>
        <div style={{ color: "#666", fontSize: 12 }}>You're always included</div>
      </div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {users.map((u) => {
          const selected = participantIds.includes(u.id);
          const isMe = u.id === meId;
          return (
            <button
              key={u.id}
              onClick={() => toggle(u.id)}
              disabled={isMe}
              title={isMe ? "You are always included" : ""}
              style={{
                padding: "8px 10px",
                borderRadius: 999,
                border: "1px solid #bbb",
                cursor: isMe ? "not-allowed" : "pointer",
                background: selected ? "#0b5" : "#fff",
                color: selected ? "#fff" : "#111",
                opacity: isMe ? 0.85 : 1,
              }}
            >
              {u.name || u.email}
              {isMe ? " (you)" : ""}
            </button>
          );
        })}
      </div>
    </div>
  );
}
