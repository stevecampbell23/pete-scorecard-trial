import { DEFAULT_CLUBS } from "./engine/yardage";
import { uid } from "./engine/id";
import type { AppState, Club } from "./types";

export const STORAGE_KEY = "peteScorecard.trial.v1";

export function blankState(): AppState {
  const me = uid();
  return {
    players: [{ id: me, name: "You" }],
    courses: [],
    rounds: [],
    live: null,
    me,
    clubs: DEFAULT_CLUBS.map((c) => ({ ...c, id: uid() })) as Club[],
  };
}

export function loadState(): { state: AppState; storageOk: boolean } {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { state: blankState(), storageOk: true };
    const parsed = JSON.parse(raw) as AppState;
    if (!parsed.players?.length) parsed.players = blankState().players;
    parsed.courses ??= [];
    parsed.rounds ??= [];
    parsed.clubs ??= blankState().clubs;
    parsed.clubShots ??= {};
    parsed.live ??= null;
    parsed.room ??= null;
    return { state: parsed, storageOk: true };
  } catch {
    return { state: blankState(), storageOk: false };
  }
}

export function saveState(state: AppState): boolean {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    return true;
  } catch {
    return false;
  }
}

export function backupPayload(state: AppState) {
  return {
    app: "pete-scorecard-trial",
    version: 1,
    saved: new Date().toISOString(),
    data: {
      players: state.players,
      courses: state.courses,
      rounds: state.rounds,
      me: state.me,
      clubs: state.clubs,
      clubShots: state.clubShots ?? {},
    },
  };
}
