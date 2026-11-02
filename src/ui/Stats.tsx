import { useState } from "react";
import { useStore } from "../store";
import { handicapEstimate, headToHead, perNine, playedRounds, snowStreak, yearOf } from "../engine/handicap";
import { snowCount } from "../engine/scoring";
import { seasonTitle, vsPar } from "../engine/id";

function formatPer9(avg: number): string {
  const n = Math.round(avg * 10) / 10;
  if (n === 0) return "E";
  return n > 0 ? `+${n}` : `−${Math.abs(n)}`;
}

export function Stats() {
  const { state } = useStore();
  const has = state.players.filter((p) => playedRounds(p.id, state.rounds, state.courses).length);
  const [who, setWho] = useState(has.some((p) => p.id === state.me) ? state.me : has[0]?.id);
  if (!has.length) {
    return (
      <div className="view">
        <div>
          <div className="eyebrow">Stats</div>
          <h1>Nothing to brag about yet</h1>
        </div>
        <p className="note">Play a round. Handicap, snowmen, and scoring mix show up after the first one.</p>
      </div>
    );
  }
  const pid = who ?? has[0].id;
  const player = state.players.find((p) => p.id === pid);
  const isYou = pid === state.me;
  const prs = playedRounds(pid, state.rounds, state.courses);
  const year = new Date().getFullYear();
  const yearRounds = prs.filter((p) => yearOf(p.round.date) === year);
  const hc = handicapEstimate(prs);
  const avg = prs.length ? prs.reduce((a, p) => a + perNine(p), 0) / prs.length : 0;
  const best = prs.reduce((p, q) => (q.total - q.parTotal < p.total - p.parTotal ? q : p));
  const snowTot = prs.reduce((a, p) => a + snowCount(p.scores), 0);
  const opponents = state.players.filter((p) => p.id !== pid && playedRounds(p.id, state.rounds, state.courses).length);

  return (
    <div className="view">
      <div>
        <div className="eyebrow">Stats</div>
        <div className="chips">
          {has.map((p) => (
            <button key={p.id} className="chip" type="button" aria-pressed={p.id === pid} onClick={() => setWho(p.id)}>
              {p.id === state.me ? "You" : p.name}
            </button>
          ))}
        </div>
      </div>
      <div className="block">
        <div className="eyebrow">Season so far</div>
        <h1>{seasonTitle(player?.name ?? "You", isYou, year)}</h1>
        <p className="note">
          {yearRounds.length} round{yearRounds.length === 1 ? "" : "s"} in the books.
        </p>
      </div>
      <div className="hero">
        <div>
          <span className="eyebrow">Est. handicap</span>
          <span className="big">{hc == null ? "—" : hc.toFixed(1)}</span>
          <span className="sub">{hc == null ? `${Math.max(0, 3 - prs.length)} more round${3 - prs.length === 1 ? "" : "s"} to unlock` : `From ${Math.min(prs.length, 20)} rounds · not official`}</span>
        </div>
        <div>
          <span className="eyebrow">Avg vs par</span>
          <span className="big">{formatPer9(avg)}</span>
          <span className="sub">per 9 holes · {prs.length} rounds</span>
        </div>
        <div>
          <span className="eyebrow">Snowmen</span>
          <span className={`big${snowTot ? " warn" : ""}`}>{snowTot}</span>
          <span className="sub">in {prs.filter((p) => snowCount(p.scores)).length} of {prs.length} rounds</span>
        </div>
        <div>
          <span className="eyebrow">No-snowman streak</span>
          <span className={`big${snowStreak(prs) ? " green" : ""}`}>{snowStreak(prs)}</span>
          <span className="sub">rounds in a row</span>
        </div>
      </div>
      <div className="block">
        <h3>Best round</h3>
        <div className="big green">{best.total}</div>
        <span className="sub">
          {vsPar(best.total, best.parTotal)} · {best.course.name} ({best.holes})
        </span>
      </div>
      {opponents.map((o) => {
        const h2h = headToHead(pid, o.id, state.rounds);
        const n = h2h.wins + h2h.losses + h2h.ties;
        if (!n) return null;
        return (
          <div className="block" key={o.id}>
            <div className="eyebrow">
              {isYou ? "You" : player?.name} vs {o.name}
            </div>
            <h2>
              {h2h.wins}–{h2h.losses}–{h2h.ties}
            </h2>
            <span className="note">
              {h2h.wins} wins, {h2h.losses} losses, {h2h.ties} ties · {n} round{n === 1 ? "" : "s"} together
            </span>
          </div>
        );
      })}
      <p className="note">
        Handicap is an estimate modeled on the World Handicap System. Nine-hole rounds are doubled. It is a progress number, not an official index.
      </p>
    </div>
  );
}
