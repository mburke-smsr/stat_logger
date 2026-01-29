import React from "react";
import type { Skill } from "../../types";

type Props = {
  skillsByCategory: Array<[string, Skill[]]>;
  selectedSkillIds: number[];
  setSelectedSkillIds: (ids: number[]) => void;
};

export default function SkillChipsByCategory({ skillsByCategory, selectedSkillIds, setSelectedSkillIds }: Props) {
  function toggle(id: number) {
    setSelectedSkillIds(selectedSkillIds.includes(id) ? selectedSkillIds.filter((x) => x !== id) : [...selectedSkillIds, id]);
  }

  return (
    <div>
      <div style={{ marginBottom: 8 }}>Skills (tap chips)</div>
      <div style={{ display: "grid", gap: 14 }}>
        {skillsByCategory.map(([cat, list]) => (
          <div key={cat}>
            <div style={{ fontWeight: 600, marginBottom: 6 }}>{cat}</div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {list.map((s) => {
                const selected = selectedSkillIds.includes(s.id);
                return (
                  <button
                    key={s.id}
                    onClick={() => toggle(s.id)}
                    style={{
                      padding: "8px 10px",
                      borderRadius: 999,
                      border: "1px solid #bbb",
                      cursor: "pointer",
                      background: selected ? "#111" : "#fff",
                      color: selected ? "#fff" : "#111",
                    }}
                  >
                    {s.name}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
