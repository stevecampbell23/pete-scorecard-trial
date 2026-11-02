import { useMemo, useState } from "react";
import { courseById, useActions, useStore } from "../store";
import { todayISO, vsPar } from "../engine/id";
import { handicapEstimate, playedRounds, snowStreak } from "../engine/handicap";
import { LiveRoundView } from "./LiveRound";
import { Yardage } from "./Yardage";
import { FinishedRound } from "./FinishedRound";
import { CourseSearch } from "./CourseSearch";

export function Play({ onOpenRound }: { onOpenRound: (id: string) => void }) {
  const { state } = useStore();
  if (state.live) return <LiveRoundView onFinished={onOpenRound} />;
  return <TeeItUp onOpenRound={onOpenRound} />;
}

function TeeItUp({ onOpenRound }: { onOpenRound: (id: string) => void }) {
  const { state } = useStore();
  const actions = useActions();
  const [sel, setSel] = useState<Set<string>>(() => new Set([state.me]));
  const [courseId, setCourseId] = useState(state.lastCourseId && state.courses.some((c) => c.id === state.lastCourseId) ? state.lastCourseId : state.courses[0]?.id ?? "");
  const [date, setDate] = useState(todayISO());
  const [showDate, setShowDate] = useState(false);
  const [newName, setNewName] = useState("");
  const [paper, setPaper] = useState(false);
  const [yardage, setYardage] = useState(false);
  const [justFinished, setJustFinished] = useState<string | null>(null);

  const meFirst = useMemo(() => {
    const me = state.players.find((p) => p.id === state.me);
    return [me, ...state.players.filter((p) => p.id !== state.me)].filter(Boolean);
  }, [state.players, state.me]);

  if (justFinished) {
    const round = state.rounds.find((r) => r.id === justFinished);
    if (round) return <FinishedRound round={round} onDone={() => setJustFinished(null)} />;
  }

  if (yardage) return <Yardage onBack={() => setYardage(false)} />;
  if (paper) return <EnterPaper onBack={() => setPaper(false)} onSaved={(id) => { setPaper(false); onOpenRound(id); }} />;

  const prs = playedRounds(state.me, state.rounds, state.courses);
  const hc = handicapEstimate(prs);
  const last = prs[prs.length - 1];
  const streak = snowStreak(prs);

  return (
    <div className="view">
      <div>
        <div className="eyebrow">New round</div>
        <h1>Tee it up</h1>
      </div>
      <div className="block">
        <CourseSearch selectedId={courseId} onSelect={setCourseId} />
        {courseId ? (
          <>
          <div className="field">
            <span>Who’s playing</span>
            <div className="chips">
              {meFirst.map((p) => (
                <button
                  key={p!.id}
                  className="chip"
                  type="button"
                  aria-pressed={sel.has(p!.id)}
                  onClick={() => {
                    const next = new Set(sel);
                    if (next.has(p!.id)) next.delete(p!.id);
                    else if (next.size < 4) next.add(p!.id);
                    setSel(next);
                  }}
                >
                  {p!.name}
                </button>
              ))}
            </div>
            <div className="row">
              <input
                type="text"
                placeholder="Add a player’s name"
                value={newName}
                maxLength={20}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    const id = actions.addPlayer(newName);
                    if (id && sel.size < 4) setSel(new Set(sel).add(id));
                    setNewName("");
                  }
                }}
              />
              <button
                className="btn small"
                type="button"
                onClick={() => {
                  const id = actions.addPlayer(newName);
                  if (id && sel.size < 4) setSel(new Set(sel).add(id));
                  setNewName("");
                }}
              >
                Add
              </button>
            </div>
            <span className="note">Up to 4 per round. Tap a name to leave them out.</span>
          </div>
          <div className="note">
            Date: {showDate ? (
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            ) : (
              <>
                <strong>Today</strong>{" "}
                <button className="linkish" type="button" onClick={() => setShowDate(true)}>
                  change
                </button>
              </>
            )}
          </div>
          <button
            className="btn solid"
            type="button"
            onClick={() => actions.startRound({ date, courseId, playerIds: [...sel] })}
          >
            Start round
          </button>
          <button className="btn ghost" type="button" onClick={() => setPaper(true)}>
            Enter a finished round
          </button>
          <span className="note">Kept a paper card? Type the scores at once. Par is a hint until you tap Next hole.</span>
          </>
        ) : (
          <span className="note">Pick a course above, then choose who’s playing.</span>
        )}
      </div>
      <button className="block" type="button" onClick={() => setYardage(true)} style={{ textAlign: "left" }}>
        <div className="row" style={{ justifyContent: "space-between" }}>
          <strong>Pete’s yardage card</strong>
          <span>→</span>
        </div>
        <span className="note">Put in your carry distances. Pete picks the club. Wind is a percent you choose, not weather magic.</span>
      </button>
      {last ? (
        <div className="hero">
          <div>
            <span className="eyebrow">Last round</span>
            <span className="big">{last.total}</span>
            <span className="sub">{last.course.name} · {vsPar(last.total, last.parTotal)}</span>
          </div>
          <div>
            <span className="eyebrow">Est. handicap</span>
            <span className="big">{hc == null ? "—" : hc.toFixed(1)}</span>
            <span className="sub">{hc == null ? `${Math.max(0, 3 - prs.length)} more to unlock` : "Not an official index"}</span>
          </div>
          <div>
            <span className="eyebrow">No-snowman streak</span>
            <span className={`big${streak ? " green" : ""}`}>{streak}</span>
            <span className="sub">rounds in a row</span>
          </div>
        </div>
      ) : (
        <p className="note">Score hole by hole. Thru only counts holes you recorded. Next hole locks par if you leave it blank.</p>
      )}
    </div>
  );
}

function EnterPaper({ onBack, onSaved }: { onBack: () => void; onSaved: (id: string) => void }) {
  const { state } = useStore();
  const actions = useActions();
  const [courseId, setCourseId] = useState(state.courses[0]?.id ?? "");
  const [pid, setPid] = useState(state.me);
  const course = courseById(state, courseId);
  const [vals, setVals] = useState<number[]>(() => course.par.map((p) => p));

  return (
    <div className="view">
      <button className="btn small ghost" type="button" onClick={onBack}>
        ← Back
      </button>
      <div>
        <div className="eyebrow">Paper card</div>
        <h1>Type the scores</h1>
      </div>
      <div className="block">
        <CourseSearch
          selectedId={courseId}
          onSelect={(id) => {
            setCourseId(id);
            const c = courseById(state, id);
            setVals(c.par.map((p) => p));
          }}
        />
        <label className="field">
          <span>Player</span>
          <select value={pid} onChange={(e) => setPid(e.target.value)}>
            {state.players.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </label>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(9, minmax(0,1fr))", gap: 6 }}>
          {course.par.map((p, i) => (
            <label key={i} style={{ display: "grid", gap: 2, textAlign: "center", fontSize: 11, color: "var(--muted)", fontWeight: 700 }}>
              {i + 1}
              <span className="muted">p{p}</span>
              <input
                type="number"
                min={1}
                max={15}
                value={vals[i] ?? p}
                onChange={(e) => {
                  const next = [...vals];
                  next[i] = Number(e.target.value);
                  setVals(next);
                }}
                style={{ padding: "8px 2px", textAlign: "center", minHeight: 42 }}
              />
            </label>
          ))}
        </div>
        {course.par.length ? (
        <button
          className="btn solid"
          type="button"
          onClick={() => {
            const id = actions.enterFinishedRound({
              courseId,
              scores: { [pid]: vals.map((v, i) => v || course.par[i]) },
            });
            onSaved(id);
          }}
        >
          Save round
        </button>
        ) : (
          <span className="note">Pick a course first.</span>
        )}
      </div>
    </div>
  );
}
