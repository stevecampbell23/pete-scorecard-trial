import { useMemo, useState, type ReactNode } from "react";
import type { GameSettings, SavedRound } from "../types";
import { courseById, playerById, useStore } from "../store";
import { combine, formatAmt, nassau, settlementSummary, skins, snowmanPays, strokePlay } from "../engine/games";

const defaults: GameSettings = {
  skins: true,
  skinsValue: 1,
  skinsCarry: true,
  nassau: true,
  nassauValue: 2,
  stroke: false,
  snowman: true,
  snowmanValue: 1,
  mode: "points",
};

export function SettleUp({ round, onBack }: { round: SavedRound; onBack: () => void }) {
  const { state } = useStore();
  const [g, setG] = useState<GameSettings>(defaults);
  const ids = Object.keys(round.scores);
  const names = Object.fromEntries(ids.map((id) => [id, playerById(state, id).name]));
  const course = courseById(state, round.courseId);
  const holes = course.par.length;

  const ledger = useMemo(() => {
    const parts = [];
    if (g.skins) parts.push(skins(ids, round.scores, g.skinsValue, g.skinsCarry));
    if (g.nassau) parts.push(nassau(ids, round.scores, g.nassauValue));
    if (g.stroke) parts.push(strokePlay(ids, round.scores));
    if (g.snowman) parts.push(snowmanPays(ids, round.scores, g.snowmanValue));
    return combine(parts);
  }, [g, ids, round.scores]);

  const summary = settlementSummary(ledger, names);
  const unit = g.mode === "dollars" ? "dollars" : "points";

  function copy() {
    const text = [
      `Settle up · ${course.name}`,
      summary.headline,
      ...ids.map((id) => `${names[id]} ${formatAmt(ledger[id], g.mode)}`),
      "Bragging rights only. No money moved.",
    ].join("\n");
    void navigator.clipboard?.writeText(text);
  }

  return (
    <div className="view">
      <button className="btn small ghost" type="button" onClick={onBack}>
        ← Round
      </button>
      <div>
        <div className="eyebrow">The games</div>
        <h1>Settle up</h1>
        <p className="note">
          This is a calculator. Nothing is charged. {holes <= 9 ? "Nassau on 9 holes is holes 1–3, 4–6, and 7–9." : "Nassau is front, back, and overall."}
        </p>
      </div>
      <div className="chips">
        <button className="chip" type="button" aria-pressed={g.mode === "points"} onClick={() => setG({ ...g, mode: "points" })}>
          Points
        </button>
        <button className="chip" type="button" aria-pressed={g.mode === "dollars"} onClick={() => setG({ ...g, mode: "dollars" })}>
          Dollars
        </button>
      </div>
      <Toggle label="Skins" hint="Low score alone wins the hole." on={g.skins} set={(skins) => setG({ ...g, skins })}>
        <label className="field">
          <span>{unit} per skin</span>
          <input type="number" min={0} value={g.skinsValue} onChange={(e) => setG({ ...g, skinsValue: Number(e.target.value) })} />
        </label>
        <label className="row">
          <input type="checkbox" checked={g.skinsCarry} onChange={(e) => setG({ ...g, skinsCarry: e.target.checked })} />
          Ties carry over
        </label>
      </Toggle>
      <Toggle label="Nassau" hint={holes <= 9 ? "Three 3-hole bets." : "Front, back, overall."} on={g.nassau} set={(nassauOn) => setG({ ...g, nassau: nassauOn })}>
        <label className="field">
          <span>{unit} per bet</span>
          <input type="number" min={0} value={g.nassauValue} onChange={(e) => setG({ ...g, nassauValue: Number(e.target.value) })} />
        </label>
      </Toggle>
      <Toggle label="Stroke play" hint="Higher total pays the difference in strokes." on={g.stroke} set={(stroke) => setG({ ...g, stroke })} />
      <Toggle label="Snowman pays" hint="An 8 or worse and you pay everybody." on={g.snowman} set={(snowman) => setG({ ...g, snowman })}>
        <label className="field">
          <span>{unit} per snowman</span>
          <input type="number" min={0} value={g.snowmanValue} onChange={(e) => setG({ ...g, snowmanValue: Number(e.target.value) })} />
        </label>
      </Toggle>
      <div className="block">
        <div className="eyebrow">Settle up</div>
        <h2>{summary.headline}</h2>
        {ids.map((id) => (
          <div className="row" key={id} style={{ justifyContent: "space-between" }}>
            <strong>{names[id]}</strong>
            <span className={ledger[id] > 0 ? "big green" : ledger[id] < 0 ? "big warn" : ""} style={{ fontSize: 28 }}>
              {formatAmt(ledger[id], g.mode)}
            </span>
          </div>
        ))}
        <p className="note">Playing for {unit}. Bragging rights only.</p>
        <button className="btn ghost" type="button" onClick={copy}>
          Copy text
        </button>
      </div>
    </div>
  );
}

function Toggle({
  label,
  hint,
  on,
  set,
  children,
}: {
  label: string;
  hint: string;
  on: boolean;
  set: (v: boolean) => void;
  children?: ReactNode;
}) {
  return (
    <div className="block">
      <div className="row" style={{ justifyContent: "space-between" }}>
        <h3>{label}</h3>
        <button className="chip" type="button" aria-pressed={on} onClick={() => set(!on)}>
          {on ? "On" : "Off"}
        </button>
      </div>
      <span className="note">{hint}</span>
      {on ? children : null}
    </div>
  );
}
