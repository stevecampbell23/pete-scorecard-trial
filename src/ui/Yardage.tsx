import { useMemo, useState } from "react";
import pete from "../assets/pete.png";
import { useStore, useActions } from "../store";
import { uid } from "../engine/id";
import { CONDITION_PCT, effectiveYards, pickClub, typicalCarry, type Condition } from "../engine/yardage";

export function Yardage({ onBack }: { onBack: () => void }) {
  const { state } = useStore();
  const actions = useActions();
  const [pin, setPin] = useState(150);
  const [conds, setConds] = useState<Condition[]>([]);
  const [checkClub, setCheckClub] = useState(state.clubs[6]?.id ?? state.clubs[0]?.id);
  const [shots, setShots] = useState<number[]>([]);
  const [shot, setShot] = useState("");

  const effective = effectiveYards(pin, conds);
  const pick = pickClub(effective, state.clubs);
  const typical = typicalCarry(shots);

  function toggle(c: Condition) {
    setConds((cur) => (cur.includes(c) ? cur.filter((x) => x !== c) : [...cur, c]));
  }

  const labels = useMemo(
    () =>
      ({
        into: ["Into the wind", "+10%"],
        downwind: ["Downwind", "−10%"],
        uphill: ["Uphill", "+5%"],
        downhill: ["Downhill", "−5%"],
        rough: ["In the rough", "+5%"],
      }) as Record<Condition, [string, string]>,
    [],
  );

  return (
    <div className="view">
      <button className="btn small ghost" type="button" onClick={onBack}>
        ← Play
      </button>
      <div>
        <div className="eyebrow">Yardage</div>
        <h1>Ask Pete</h1>
        <p className="note">Punch in the number from the rangefinder. Conditions are buttons you pick, not GPS weather.</p>
      </div>
      <div className="banner">Using the bag on this phone. Change the numbers in the list below so Pete picks right.</div>
      <label className="field">
        <span>Yards to the pin</span>
        <input type="number" value={pin} onChange={(e) => setPin(Number(e.target.value))} />
      </label>
      <div className="chips">
        {(Object.keys(CONDITION_PCT) as Condition[]).map((c) => (
          <button key={c} className="chip" type="button" aria-pressed={conds.includes(c)} onClick={() => toggle(c)}>
            {labels[c][0]} {labels[c][1]}
          </button>
        ))}
      </div>
      {pick ? (
        <div className="block">
          <div className="row">
            <img src={pete} alt="" className="pete" />
            <div>
              <div className="eyebrow">Pete says</div>
              <h2>{pick.name}</h2>
            </div>
          </div>
          <p>
            Plays like <strong>{effective} yds</strong> ({pin} actual)
          </p>
          <span className="note">Pick a target and commit. No second guesses.</span>
        </div>
      ) : null}

      <div className="block">
        <h3>Your bag</h3>
        {state.clubs.map((c) => (
          <div className="row" key={c.id} style={{ flexWrap: "nowrap" }}>
            <input
              value={c.name}
              onChange={(e) =>
                actions.setClubs(state.clubs.map((x) => (x.id === c.id ? { ...x, name: e.target.value } : x)))
              }
            />
            <input
              type="number"
              style={{ width: 90 }}
              value={c.yards}
              onChange={(e) =>
                actions.setClubs(state.clubs.map((x) => (x.id === c.id ? { ...x, yards: Number(e.target.value) } : x)))
              }
            />
          </div>
        ))}
        <button
          className="btn small ghost"
          type="button"
          onClick={() => actions.setClubs([...state.clubs, { id: uid(), name: "Club", yards: 100 }])}
        >
          Add club
        </button>
      </div>

      <div className="block">
        <h3>Yardage reality check</h3>
        <p className="note">Type carries, not totals. Wild misses get tossed when you have enough shots.</p>
        <select value={checkClub} onChange={(e) => setCheckClub(e.target.value)}>
          {state.clubs.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <div className="row">
          <input
            type="number"
            placeholder="Carry"
            value={shot}
            onChange={(e) => setShot(e.target.value)}
          />
          <button
            className="btn small"
            type="button"
            onClick={() => {
              const n = Number(shot);
              if (n > 0) setShots([...shots, n]);
              setShot("");
            }}
          >
            Add
          </button>
        </div>
        <div className="chips">
          {shots.map((s, i) => (
            <button key={i} className="chip" type="button" onClick={() => setShots(shots.filter((_, j) => j !== i))}>
              {s} ×
            </button>
          ))}
        </div>
        {typical ? (
          <div>
            <div className="big">{typical.yards} yds</div>
            <p className="note">
              From {typical.used.length} shots
              {typical.tossed.length ? ` · tossed ${typical.tossed.join(", ")}` : ""}.
            </p>
            <button
              className="btn solid"
              type="button"
              onClick={() =>
                actions.setClubs(state.clubs.map((c) => (c.id === checkClub ? { ...c, yards: typical.yards } : c)))
              }
            >
              Put {typical.yards} on my card
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
