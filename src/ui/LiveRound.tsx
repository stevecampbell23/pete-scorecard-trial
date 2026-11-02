import { useState } from "react";
import { courseById, playerById, useActions, useStore } from "../store";
import { holeKind, holePar, thruLine } from "../engine/scoring";
import { vsPar } from "../engine/id";
import { useWakeLock } from "./useWakeLock";
import { ScorecardTable } from "./ScorecardTable";
import { Yardage } from "./Yardage";
import { useGroup } from "../sync/GroupSync";

export function LiveRoundView({ onFinished }: { onFinished: (roundId: string) => void }) {
  const { state } = useStore();
  const actions = useActions();
  const live = state.live!;
  const course = courseById(state, live.courseId);
  const n = course.par.length;
  const h = live.hole;
  const par = holePar(course.par[h]);
  const [quitArm, setQuitArm] = useState(false);
  const [yardage, setYardage] = useState(false);
  const group = useGroup();
  useWakeLock(true);

  if (yardage) return <Yardage onBack={() => setYardage(false)} />;

  const hasAny = live.playerIds.some((pid) => live.scores[pid].some((s) => s != null));

  function next() {
    const last = h >= n - 1;
    if (last) {
      const id = live.id;
      actions.goHole(h, true);
      actions.finishLive();
      onFinished(id);
      return;
    }
    actions.goHole(h + 1, true);
  }

  return (
    <div className="view">
      <div className="hole-head">
        <div>
          <div className="eyebrow">{course.name}</div>
          <div className="hole-no">{h + 1}</div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div className="par-big">{par != null ? `Par ${par}` : "Par ?"}</div>
          <div className="muted">Hole {h + 1} of {n}</div>
        </div>
      </div>
      {state.live && state.room ? (
        <span className="note">Group {state.room.code}{group.peers ? ` · ${group.peers} other phone${group.peers === 1 ? "" : "s"}` : ""}</span>
      ) : null}
      <div className="dots">
        {course.par.map((_, i) => {
          const filled = live.playerIds.every((p) => live.scores[p][i] != null);
          return (
            <button
              key={i}
              className={`dot${i === h ? " cur" : filled ? " done" : " empty"}`}
              type="button"
              aria-label={`Hole ${i + 1}${filled ? " recorded" : " not recorded"}`}
              onClick={() => actions.goHole(i, false)}
            >
              {i + 1}
            </button>
          );
        })}
      </div>
      <p className="note" style={{ margin: 0 }}>
        Par is a hint until you tap +/− or Next hole. Jumping holes does not write a score, so Thru only counts holes you actually recorded.
      </p>
      <div className="players" style={{ display: "grid", gap: 10 }}>
        {live.playerIds.map((pid) => {
          const s = live.scores[pid][h];
          const shown = s ?? par;
          const dim = s == null;
          const thru = thruLine(live.scores[pid], course.par);
          const kind = s != null && par != null ? holeKind(s, par) : null;
          return (
            <div className="pl" key={pid}>
              <div>
                <div className="nm">{playerById(state, pid).name}</div>
                <div className="tot muted num">
                  {thru.holes
                    ? `Thru ${thru.holes}: ${vsPar(thru.strokes, sumPar(live.scores[pid], course.par))} · ${thru.strokes} strokes`
                    : "No holes recorded yet"}
                </div>
                {kind === "snow" ? <div className="live-tag snow">Snowman</div> : null}
                {kind === "birdie" || kind === "eagle" ? (
                  <div className="live-tag good">{kind === "eagle" ? "Eagle" : "Birdie"}</div>
                ) : null}
              </div>
              <div className="step">
                <button type="button" aria-label="Minus" onClick={() => actions.bump(pid, -1)}>
                  −
                </button>
                <div className={`v num${dim ? " dim" : ""}`}>{shown ?? "—"}</div>
                <button type="button" aria-label="Plus" onClick={() => actions.bump(pid, 1)}>
                  +
                </button>
              </div>
            </div>
          );
        })}
      </div>
      <button className="btn ghost" type="button" onClick={() => setYardage(true)}>
        Ask Pete for a club
      </button>
      <div className="nav">
        <button className="btn ghost" type="button" disabled={h === 0} onClick={() => actions.goHole(h - 1, false)}>
          Back
        </button>
        <button className="btn solid" type="button" onClick={next}>
          {h >= n - 1 ? "Finish round" : "Next hole"}
        </button>
      </div>
      {hasAny ? (
        <div>
          <div className="eyebrow" style={{ marginBottom: 8 }}>
            Recorded so far
          </div>
          <ScorecardTable
            course={course}
            scores={Object.fromEntries(
              live.playerIds.map((pid) => [
                pid,
                live.scores[pid].map((s) => (s == null ? 0 : s)),
              ]),
            )}
          />
          <p className="note">Zeros on the preview are holes not recorded yet.</p>
        </div>
      ) : null}
      <button
        className="btn danger small"
        type="button"
        onClick={() => {
          if (quitArm) actions.abandonLive();
          else {
            setQuitArm(true);
            setTimeout(() => setQuitArm(false), 4000);
          }
        }}
      >
        {quitArm ? "Tap again to dump this round" : "Abandon round"}
      </button>
    </div>
  );
}

function sumPar(scores: Array<number | null>, par: number[]): number {
  return scores.reduce<number>((acc, s, i) => acc + (s == null ? 0 : par[i] ?? 0), 0);
}
