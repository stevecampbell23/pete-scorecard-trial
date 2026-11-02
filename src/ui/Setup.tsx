import { useState } from "react";
import { useActions, useStore } from "../store";
import { sum } from "../engine/id";
import { CourseSearch } from "./CourseSearch";

export function Setup() {
  const { state, storageOk } = useStore();
  const actions = useActions();
  const [pending, setPending] = useState<string | null>(null);

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
        <CourseSearch selectedId={state.lastCourseId} onSelect={() => {}} />
        {state.courses.map((c) => (
          <div className="row" key={c.id} style={{ justifyContent: "space-between", flexWrap: "nowrap" }}>
            <span>
              <strong>{c.name}</strong>
              <br />
              <span className="note">
                {c.par.length} holes · par {sum(c.par)}
                {c.city ? ` · ${c.city}` : ""}
                {c.teeName ? ` · ${c.teeName}` : ""}
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
