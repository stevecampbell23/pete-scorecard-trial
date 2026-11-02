import { useState } from "react";
import { useActions, useStore } from "../store";
import { sum } from "../engine/id";

export function Setup() {
  const { state, storageOk } = useStore();
  const actions = useActions();
  const [form, setForm] = useState(false);
  const [holes, setHoles] = useState(9);
  const [name, setName] = useState("");
  const [city, setCity] = useState("");
  const [pars, setPars] = useState<number[]>(Array(9).fill(4));
  const [rating, setRating] = useState("");
  const [slope, setSlope] = useState("");
  const [pending, setPending] = useState<string | null>(null);

  function openForm(n: number) {
    setHoles(n);
    setPars(Array(n).fill(4));
    setForm(true);
  }

  return (
    <div className="view">
      <div>
        <div className="eyebrow">Setup</div>
        <h1>Your crew & courses</h1>
      </div>
      {!storageOk ? (
        <div className="banner">This browser is not saving. Use Back up after each round, and skip private mode.</div>
      ) : null}
      <div className="block">
        <h3>The crew</h3>
        {state.players.map((p) => (
          <div className="row" key={p.id} style={{ flexWrap: "nowrap" }}>
            <input
              type="text"
              value={p.name}
              maxLength={20}
              aria-label="Player name"
              onChange={(e) => actions.renamePlayer(p.id, e.target.value)}
            />
            {p.id === state.me ? (
              <span className="chip" aria-pressed="true">
                You
              </span>
            ) : (
              <button className="btn small ghost" type="button" onClick={() => actions.setMe(p.id)}>
                This is me
              </button>
            )}
            {state.players.length > 1 ? (
              <button
                className="btn small ghost"
                type="button"
                onClick={() => {
                  if (pending === p.id) actions.removePlayer(p.id);
                  else {
                    setPending(p.id);
                    setTimeout(() => setPending(null), 4000);
                  }
                }}
              >
                {pending === p.id ? "Sure?" : "Remove"}
              </button>
            ) : null}
          </div>
        ))}
        <AddPlayer />
        <span className="note">“You” is whose stats show first. We say Your 2026, never You’s.</span>
      </div>
      <div className="block">
        <h3>Courses</h3>
        {state.courses.map((c) => (
          <div className="row" key={c.id} style={{ justifyContent: "space-between", flexWrap: "nowrap" }}>
            <span>
              <strong>{c.name}</strong>
              <br />
              <span className="note">
                {c.par.length} holes · par {sum(c.par)}
                {c.city ? ` · ${c.city}` : ""}
              </span>
            </span>
            <button
              className="btn small ghost"
              type="button"
              onClick={() => {
                if (state.rounds.some((r) => r.courseId === c.id)) return;
                actions.removeCourse(c.id);
              }}
            >
              Remove
            </button>
          </div>
        ))}
        {form ? (
          <div style={{ display: "grid", gap: 12, borderTop: "1px solid var(--line)", paddingTop: 14 }}>
            <label className="field">
              <span>Course name</span>
              <input value={name} onChange={(e) => setName(e.target.value)} maxLength={40} />
            </label>
            <label className="field">
              <span>Town (optional)</span>
              <input value={city} onChange={(e) => setCity(e.target.value)} maxLength={40} />
            </label>
            <div className="chips">
              {[9, 18].map((n) => (
                <button key={n} className="chip" type="button" aria-pressed={holes === n} onClick={() => openForm(n)}>
                  {n} holes
                </button>
              ))}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(9, minmax(0,1fr))", gap: 6 }}>
              {pars.map((p, i) => (
                <label key={i} style={{ display: "grid", gap: 2, textAlign: "center", fontSize: 11, color: "var(--muted)", fontWeight: 700 }}>
                  {i + 1}
                  <input
                    type="number"
                    min={3}
                    max={6}
                    value={p}
                    onChange={(e) => {
                      const next = [...pars];
                      next[i] = Number(e.target.value);
                      setPars(next);
                    }}
                    style={{ padding: "8px 2px", textAlign: "center", minHeight: 42 }}
                  />
                </label>
              ))}
            </div>
            <div className="row">
              <label className="field" style={{ flex: 1 }}>
                <span>Rating (optional)</span>
                <input value={rating} onChange={(e) => setRating(e.target.value)} />
              </label>
              <label className="field" style={{ flex: 1 }}>
                <span>Slope (optional)</span>
                <input value={slope} onChange={(e) => setSlope(e.target.value)} />
              </label>
            </div>
            <div className="row">
              <button
                className="btn solid small"
                type="button"
                onClick={() => {
                  if (!name.trim()) return;
                  actions.addCourse({
                    name: name.trim(),
                    city: city.trim() || undefined,
                    par: pars,
                    rating: rating ? Number(rating) : undefined,
                    slope: slope ? Number(slope) : undefined,
                  });
                  setForm(false);
                  setName("");
                }}
              >
                Save course
              </button>
              <button className="btn small ghost" type="button" onClick={() => setForm(false)}>
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <button className="btn small" type="button" onClick={() => openForm(9)}>
            Add a course
          </button>
        )}
      </div>
      <div className="block">
        <h3>Back up your rounds</h3>
        <p className="note" style={{ margin: 0 }}>
          This trial lives in this browser. The live site at scores.punkheadpete.com is a different app and a different save. Backup here will not change that site.
        </p>
        <div className="row">
          <button className="btn small" type="button" onClick={() => actions.downloadBackup()}>
            Save backup
          </button>
          <label className="btn small ghost">
            Load backup
            <input
              type="file"
              accept="application/json,.json"
              hidden
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                const text = await file.text();
                const parsed = JSON.parse(text);
                actions.restore(parsed.data ?? parsed);
              }}
            />
          </label>
        </div>
        <span className="note">
          {state.rounds.length} rounds · {state.players.length} players · {state.courses.length} courses
        </span>
      </div>
    </div>
  );
}

function AddPlayer() {
  const actions = useActions();
  const [v, setV] = useState("");
  return (
    <div className="row">
      <input
        type="text"
        placeholder="Add a player"
        value={v}
        maxLength={20}
        onChange={(e) => setV(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            actions.addPlayer(v);
            setV("");
          }
        }}
      />
      <button
        className="btn small"
        type="button"
        onClick={() => {
          actions.addPlayer(v);
          setV("");
        }}
      >
        Add
      </button>
    </div>
  );
}
