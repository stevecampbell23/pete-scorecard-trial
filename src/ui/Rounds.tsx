import { useState } from "react";
import { courseById, playerById, useActions, useStore } from "../store";
import { formatDate, vsPar, sum } from "../engine/id";
import { FinishedRound } from "./FinishedRound";

export function Rounds({ openId, onOpen }: { openId: string | null; onOpen: (id: string | null) => void }) {
  const { state } = useStore();
  const actions = useActions();
  const [pending, setPending] = useState<string | null>(null);
  const open = state.rounds.find((r) => r.id === openId);

  if (open) {
    return (
      <div>
        <div className="view" style={{ paddingBottom: 0 }}>
          <div className="row" style={{ justifyContent: "space-between" }}>
            <button className="btn small ghost" type="button" onClick={() => onOpen(null)}>
              ← All rounds
            </button>
            <button
              className="btn small danger"
              type="button"
              onClick={() => {
                if (pending === open.id) {
                  actions.deleteRound(open.id);
                  onOpen(null);
                } else {
                  setPending(open.id);
                  setTimeout(() => setPending(null), 4000);
                }
              }}
            >
              {pending === open.id ? "Tap again to delete" : "Delete round"}
            </button>
          </div>
        </div>
        <FinishedRound round={open} />
      </div>
    );
  }

  const list = [...state.rounds].sort((a, b) => b.date.localeCompare(a.date) || b.created - a.created);
  if (!list.length) {
    return (
      <div className="view">
        <div>
          <div className="eyebrow">Rounds</div>
          <h1>No rounds yet</h1>
        </div>
        <p className="note">Finished rounds land here with a card you can share.</p>
      </div>
    );
  }

  return (
    <div className="view">
      <div>
        <div className="eyebrow">Rounds · {list.length}</div>
        <h1>The record</h1>
      </div>
      <div>
        {list.map((r) => {
          const c = courseById(state, r.courseId);
          const ps = Object.keys(r.scores);
          const lead = ps.includes(state.me) ? state.me : ps[0];
          const s = r.scores[lead];
          return (
            <button key={r.id} className="ritem" type="button" onClick={() => onOpen(r.id)}>
              <span className="d">
                {formatDate(r.date, { month: "short" })}
                <br />
                {formatDate(r.date, { day: "numeric" })}
              </span>
              <span>
                <span className="c">{c.name}</span>
                <br />
                <span className="sn muted">
                  {ps.map((p) => `${playerById(state, p).name} ${sum(r.scores[p])}`).join(" · ")}
                </span>
              </span>
              <span className="s">{vsPar(sum(s), sum(c.par.slice(0, s.length)))}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
