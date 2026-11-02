import type { AppState, Course, LiveRound, Player, SavedRound } from "../types";

export type SharedSlice = {
  players: Player[];
  courses: Course[];
  rounds: SavedRound[];
  live: LiveRound | null;
  lastCourseId?: string;
};

export function shareSlice(state: AppState): SharedSlice {
  return {
    players: state.players,
    courses: state.courses,
    rounds: state.rounds,
    live: state.live,
    lastCourseId: state.lastCourseId,
  };
}

function mergePlayers(a: Player[], b: Player[]): Player[] {
  const byId = new Map<string, Player>();
  for (const p of [...a, ...b]) {
    const prev = byId.get(p.id);
    if (!prev) {
      byId.set(p.id, p);
      continue;
    }
    const name = p.name.trim() && p.name !== "You" ? p.name : prev.name;
    byId.set(p.id, { ...prev, ...p, name });
  }
  return [...byId.values()];
}

function mergeCourses(a: Course[], b: Course[]): Course[] {
  const byId = new Map<string, Course>();
  const ogidToId = new Map<string, string>();
  for (const c of [...a, ...b]) {
    if (c.ogid) {
      const existingId = ogidToId.get(c.ogid);
      if (existingId && existingId !== c.id) {
        const prev = byId.get(existingId);
        byId.set(existingId, { ...prev, ...c, id: existingId });
        continue;
      }
      ogidToId.set(c.ogid, c.id);
    }
    const prev = byId.get(c.id);
    byId.set(c.id, prev ? { ...prev, ...c, id: c.id } : c);
  }
  return [...byId.values()];
}

function mergeRounds(a: SavedRound[], b: SavedRound[]): SavedRound[] {
  const byId = new Map<string, SavedRound>();
  for (const r of [...a, ...b]) byId.set(r.id, r);
  return [...byId.values()].sort((x, y) => x.created - y.created);
}

function stamp(live: LiveRound): number {
  return live.updated ?? live.created;
}

export function mergeLive(a: LiveRound | null, b: LiveRound | null): LiveRound | null {
  if (!a) return b;
  if (!b) return a;
  if (a.id !== b.id) return stamp(a) >= stamp(b) ? a : b;
  const playerIds = [...new Set([...a.playerIds, ...b.playerIds])].slice(0, 4);
  const len = Math.max(
    a.scores[a.playerIds[0]]?.length ?? 0,
    b.scores[b.playerIds[0]]?.length ?? 0,
    ...playerIds.map((id) => Math.max(a.scores[id]?.length ?? 0, b.scores[id]?.length ?? 0)),
  );
  const newer = stamp(a) >= stamp(b) ? a : b;
  const scores: LiveRound["scores"] = {};
  for (const pid of playerIds) {
    scores[pid] = Array.from({ length: len }, (_, i) => {
      const av = a.scores[pid]?.[i] ?? null;
      const bv = b.scores[pid]?.[i] ?? null;
      if (av != null && bv != null && av !== bv) return stamp(a) >= stamp(b) ? av : bv;
      return av ?? bv;
    });
  }
  return {
    ...newer,
    playerIds,
    scores,
    hole: newer.hole,
    updated: Math.max(stamp(a), stamp(b)),
  };
}

/** Shared group fields merge. Bag, GPS, and "me" stay on this phone. */
export function mergeShared(local: AppState, remote: SharedSlice): AppState {
  const players = mergePlayers(local.players, remote.players);
  const me = players.some((p) => p.id === local.me) ? local.me : players[0]?.id ?? local.me;
  return {
    ...local,
    players,
    courses: mergeCourses(local.courses, remote.courses),
    rounds: mergeRounds(local.rounds, remote.rounds),
    live: mergeLive(local.live, remote.live),
    lastCourseId: local.lastCourseId ?? remote.lastCourseId,
    me,
  };
}
