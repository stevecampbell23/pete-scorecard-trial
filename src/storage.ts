import { DEFAULT_CLUBS } from "./engine/yardage";
import { uid } from "./engine/id";
import type { AppState, Club } from "./types";

export const STORAGE_KEY = "peteScorecard.trial.v1";

export const PRESET_COURSES = [
  {
    id: "ben-hawes-par-3",
    name: "Ben Hawes Par 3",
    city: "Owensboro, KY",
    par: [3, 3, 3, 3, 3, 3, 3, 3, 3],
  },
  {
    id: "paul-walker",
    name: "Paul Walker",
    city: "Bowling Green, KY",
    par: [4, 5, 3, 4, 4, 5, 4, 3, 4],
  },
];

export function blankState(): AppState {
  const me = uid();
  return {
    players: [{ id: me, name: "You" }],
    courses: PRESET_COURSES.map((c) => ({ ...c, par: [...c.par] })),
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
    parsed.live ??= null;
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
    },
  };
}
