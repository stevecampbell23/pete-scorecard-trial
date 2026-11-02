import { useState } from "react";
import type { Tab } from "./types";
import { useStore } from "./store";
import { Play } from "./ui/Play";
import { Stats } from "./ui/Stats";
import { Rounds } from "./ui/Rounds";
import { Setup } from "./ui/Setup";
import { Yardage } from "./ui/Yardage";

export function App() {
  const { state, storageOk } = useStore();
  const [tab, setTab] = useState<Tab>("play");
  const [openRound, setOpenRound] = useState<string | null>(null);
  const live = Boolean(state.live);

  function go(next: Tab) {
    setTab(next);
    if (next !== "rounds") setOpenRound(null);
    window.scrollTo(0, 0);
  }

  return (
    <div className="app">
      <header className={`mast${live ? " compact" : ""}`}>
        <div className="wordmark">
          <span className="script">Punk Head Pete</span>
          <span className="golf">Golf</span>
          <span className="trial">Trial build — not the live site</span>
        </div>
        <div className="tag">
          Scorecard
          <br />
          If you know, you golf
        </div>
      </header>
      {!storageOk ? (
        <div className="banner" style={{ marginTop: 14 }}>
          This browser isn’t saving rounds. Skip private mode, or use Setup → Back up.
        </div>
      ) : null}
      <main>
        {tab === "play" ? (
          <Play
            onOpenRound={(id) => {
              setOpenRound(id);
              go("rounds");
            }}
          />
        ) : null}
        {tab === "bag" ? <Yardage onBack={() => go("play")} /> : null}
        {tab === "stats" ? <Stats /> : null}
        {tab === "rounds" ? <Rounds openId={openRound} onOpen={setOpenRound} /> : null}
        {tab === "setup" ? <Setup /> : null}
      </main>
      <nav className="tabs" aria-label="Sections">
        <div className="in">
          {(["play", "bag", "stats", "rounds", "setup"] as Tab[]).map((t) => (
            <button key={t} type="button" data-tab={t} aria-current={tab === t ? "page" : undefined} onClick={() => go(t)}>
              {t}
            </button>
          ))}
        </div>
      </nav>
    </div>
  );
}
