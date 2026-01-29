import React from "react";

export type LogKind = "training" | "meeting";

type Props = {
  // Modern API
  value?: LogKind;
  onChange?: (kind: LogKind) => void;

  // Back-compat API
  onPick?: (kind: LogKind) => void;
};

export default function KindSelector({ value, onChange, onPick }: Props) {
  const handler = onChange ?? onPick;

  function pick(k: LogKind) {
    if (typeof handler !== "function") {
      console.warn("KindSelector: missing onChange/onPick handler");
      return;
    }
    handler(k);
  }

  const selected = value;

  return (
    <div style={{ display: "grid", gap: 12 }}>
      <div style={{ color: "var(--muted)" }}>What are you logging?</div>

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        <button
          type="button"
          onClick={() => pick("training")}
          className="btn"
          style={{
            minWidth: 180,
            justifyContent: "flex-start",
            borderColor: selected === "training" ? "var(--ring)" : "var(--border)",
          }}
        >
          <div style={{ display: "grid", gap: 2, textAlign: "left" }}>
            <div style={{ fontWeight: 800 }}>Training</div>
            <div style={{ fontSize: 12, color: "var(--muted2)" }}>skills + roster + time</div>
          </div>
        </button>

        <button
          type="button"
          onClick={() => pick("meeting")}
          className="btn"
          style={{
            minWidth: 180,
            justifyContent: "flex-start",
            borderColor: selected === "meeting" ? "var(--ring)" : "var(--border)",
          }}
        >
          <div style={{ display: "grid", gap: 2, textAlign: "left" }}>
            <div style={{ fontWeight: 800 }}>Meeting</div>
            <div style={{ fontSize: 12, color: "var(--muted2)" }}>board / team</div>
          </div>
        </button>
      </div>

      <div style={{ color: "var(--muted2)", fontSize: 13 }}>
        Tip: Personal training can still include a roster (e.g. 2-person rope practice).
      </div>
    </div>
  );
}
