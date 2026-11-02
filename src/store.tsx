import { createContext, useContext, useMemo, useSyncExternalStore, type ReactNode } from "react";
import { backupPayload, loadState, saveState } from "./storage";
import type { AppState, Club, Course, LiveRound, Player, SavedRound } from "./types";
import { uid, todayISO } from "./engine/id";
import { bumpScore, commitIfEmpty, toSavedScores } from "./engine/scoring";

type Store = {
  state: AppState;
  storageOk: boolean;
  set: (patch: Partial<AppState> | ((s: AppState) => AppState)) => void;
};

let snapshot: { state: AppState; storageOk: boolean } = loadState();
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((l) => l());
}

function persist(next: AppState) {
  const ok = saveState(next);
  snapshot = { state: next, storageOk: ok && snapshot.storageOk };
  emit();
}

export function getSnapshot() {
  return snapshot;
}

export function subscribe(fn: () => void) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

const StoreCtx = createContext<Store | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const snap = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  const api = useMemo<Store>(
    () => ({
      state: snap.state,
      storageOk: snap.storageOk,
      set: (patch) => {
        const current = snapshot.state;
        const next = typeof patch === "function" ? patch(current) : { ...current, ...patch };
        persist(next);
      },
    }),
    [snap],
  );
  return <StoreCtx.Provider value={api}>{children}</StoreCtx.Provider>;
}

export function useStore() {
  const ctx = useContext(StoreCtx);
  if (!ctx) throw new Error("store missing");
  return ctx;
}

export function useActions() {
  const { set, state } = useStore();

  return {
    renamePlayer(id: string, name: string) {
      set((s) => ({
        ...s,
        players: s.players.map((p) => (p.id === id ? { ...p, name: name.slice(0, 20) } : p)),
      }));
    },
    addPlayer(name: string) {
      const n = name.trim().slice(0, 20);
      if (!n) return null;
      const id = uid();
      set((s) => ({ ...s, players: [...s.players, { id, name: n }] }));
      return id;
    },
    removePlayer(id: string) {
      set((s) => {
        if (s.players.length < 2) return s;
        const players = s.players.filter((p) => p.id !== id);
        return { ...s, players, me: s.me === id ? players[0].id : s.me };
      });
    },
    setMe(id: string) {
      set({ me: id });
    },
    addCourse(course: Omit<Course, "id"> & { id?: string }) {
      const existing = course.ogid ? snapshot.state.courses.find((c) => c.ogid === course.ogid) : undefined;
      const id = existing?.id ?? course.id ?? uid();
      const next: Course = { ...existing, ...course, id };
      set((s) => ({
        ...s,
        courses: existing ? s.courses.map((c) => (c.id === id ? next : c)) : [...s.courses, next],
        lastCourseId: id,
      }));
      return next;
    },
    setFix(fix: AppState["lastFix"]) {
      set({ lastFix: fix });
    },
    removeCourse(id: string) {
      set((s) => {
        if (s.rounds.some((r) => r.courseId === id)) return s;
        return { ...s, courses: s.courses.filter((c) => c.id !== id) };
      });
    },
    startRound(opts: { date?: string; courseId: string; playerIds: string[] }) {
      const course = state.courses.find((c) => c.id === opts.courseId);
      if (!course || !opts.playerIds.length || !course.par.length) return;
      const live: LiveRound = {
        id: uid(),
        date: opts.date || todayISO(),
        courseId: opts.courseId,
        playerIds: opts.playerIds.slice(0, 4),
        hole: 0,
        scores: Object.fromEntries(opts.playerIds.map((id) => [id, Array(course.par.length).fill(null)])),
        created: Date.now(),
      };
      set({ live, lastCourseId: opts.courseId });
    },
    enterFinishedRound(opts: { date?: string; courseId: string; scores: Record<string, number[]> }) {
      const round: SavedRound = {
        id: uid(),
        date: opts.date || todayISO(),
        courseId: opts.courseId,
        scores: opts.scores,
        created: Date.now(),
      };
      set((s) => ({ ...s, rounds: [...s.rounds, round], lastCourseId: opts.courseId }));
      return round.id;
    },
    bump(pid: string, delta: number) {
      set((s) => {
        if (!s.live) return s;
        const course = s.courses.find((c) => c.id === s.live!.courseId);
        const par = course?.par[s.live.hole] ?? 4;
        const nextScores = { ...s.live.scores, [pid]: [...s.live.scores[pid]] };
        nextScores[pid][s.live.hole] = bumpScore(nextScores[pid][s.live.hole], par, delta);
        return { ...s, live: { ...s.live, scores: nextScores } };
      });
    },
    goHole(index: number, commitCurrent: boolean) {
      set((s) => {
        if (!s.live) return s;
        const course = s.courses.find((c) => c.id === s.live!.courseId);
        let scores = s.live.scores;
        if (commitCurrent) {
          scores = { ...scores };
          for (const pid of s.live.playerIds) {
            const row = [...scores[pid]];
            row[s.live.hole] = commitIfEmpty(row[s.live.hole], course?.par[s.live.hole] ?? 4);
            scores[pid] = row;
          }
        }
        return { ...s, live: { ...s.live, scores, hole: index } };
      });
    },
    finishLive() {
      set((s) => {
        if (!s.live) return s;
        const course = s.courses.find((c) => c.id === s.live!.courseId);
        const par = course?.par ?? [];
        const round: SavedRound = {
          id: s.live.id,
          date: s.live.date,
          courseId: s.live.courseId,
          scores: toSavedScores(s.live, par),
          created: s.live.created,
        };
        return { ...s, live: null, rounds: [...s.rounds, round] };
      });
    },
    abandonLive() {
      set({ live: null });
    },
    deleteRound(id: string) {
      set((s) => ({ ...s, rounds: s.rounds.filter((r) => r.id !== id) }));
    },
    setClubs(clubs: Club[]) {
      set({ clubs });
    },
    restore(data: Partial<AppState>) {
      set((s) => ({
        ...s,
        players: data.players ?? s.players,
        courses: data.courses ?? s.courses,
        rounds: data.rounds ?? s.rounds,
        me: data.me ?? s.me,
        clubs: data.clubs ?? s.clubs,
        lastCourseId: data.lastCourseId ?? s.lastCourseId,
        live: null,
      }));
    },
    downloadBackup() {
      const blob = new Blob([JSON.stringify(backupPayload(state), null, 2)], { type: "application/json" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `pete-scorecard-trial-${todayISO()}.json`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 1500);
    },
  };
}

export function courseById(state: AppState, id: string): Course {
  return state.courses.find((c) => c.id === id) ?? { id, name: "Deleted course", par: [] };
}

export function playerById(state: AppState, id: string): Player {
  return state.players.find((p) => p.id === id) ?? { id, name: "Former player" };
}
