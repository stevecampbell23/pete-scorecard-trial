import { useState } from "react";
import type { SavedRound } from "../types";
import { courseById, playerById, useStore } from "../store";
import { mixFor, snowCount, verdict } from "../engine/scoring";
import { perNine, playedRounds } from "../engine/handicap";
import { ScorecardTable } from "./ScorecardTable";
import { RoundCard } from "./RoundCard";
import { SettleUp } from "./SettleUp";

export function FinishedRound({ round, onDone }: { round: SavedRound; onDone?: () => void }) {
  const { state } = useStore();
  const course = courseById(state, round.courseId);
  const pids = Object.keys(round.scores);
  const [pid, setPid] = useState(pids.includes(state.me) ? state.me : pids[0]);
  const [settle, setSettle] = useState(false);
  const prs = playedRounds(pid, state.rounds, state.courses);
  const mine = prs.find((p) => p.round.id === round.id);
  const prior = prs.filter((p) => p.round.id !== round.id && p.holes === (mine?.holes ?? 0));
  const isBest = Boolean(mine && prior.length && perNine(mine) < Math.min(...prior.map(perNine)));
  const scores = round.scores[pid];
  const par = course.par.slice(0, scores.length);
  const line = verdict(scores, par, isBest);

  if (settle) return <SettleUp round={round} onBack={() => setSettle(false)} />;

  return (
    <div className="view">
      {onDone ? (
        <button className="btn small ghost" type="button" onClick={onDone}>
          ← Play
        </button>
      ) : null}
      <div>
        <div className="eyebrow">Round saved · {course.name}</div>
        <h1>
          {playerById(state, pid).name} shot {scores.reduce((a, b) => a + b, 0)}
        </h1>
        <div className="verdict">{line}</div>
      </div>
      {pids.length > 1 ? (
        <div className="chips">
          {pids.map((p) => (
            <button key={p} className="chip" type="button" aria-pressed={p === pid} onClick={() => setPid(p)}>
              {playerById(state, p).name} · {round.scores[p].reduce((a, b) => a + b, 0)}
            </button>
          ))}
        </div>
      ) : null}
      <ScorecardTable course={course} scores={round.scores} />
      <p className="note">
        {snowCount(scores) ? `${snowCount(scores)} snowman${snowCount(scores) > 1 ? "s" : ""}` : "No snowmen"} ·{" "}
        {mixFor(scores, par).birdie} birdie+ · {mixFor(scores, par).par} pars
      </p>
      {pids.length > 1 ? (
        <button className="btn solid" type="button" onClick={() => setSettle(true)}>
          Settle up
        </button>
      ) : null}
      <RoundCard round={round} pid={pid} course={course} />
    </div>
  );
}
