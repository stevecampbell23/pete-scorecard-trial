import type { Course, SavedRound } from "../types";
import { sum } from "./id";

export type PlayedRound = {
  round: SavedRound;
  course: Course;
  scores: number[];
  par: number[];
  total: number;
  parTotal: number;
  holes: number;
};

export function playedRounds(playerId: string, rounds: SavedRound[], courses: Course[]): PlayedRound[] {
  return rounds
    .filter((r) => r.scores[playerId]?.length)
    .map((r) => {
      const course = courses.find((c) => c.id === r.courseId) ?? {
        id: r.courseId,
        name: "Deleted course",
        par: r.scores[playerId].map(() => 4),
      };
      const scores = r.scores[playerId];
      const par = course.par.slice(0, scores.length);
      return {
        round: r,
        course,
        scores,
        par,
        total: sum(scores),
        parTotal: sum(par),
        holes: scores.length,
      };
    })
    .sort((a, b) => a.round.date.localeCompare(b.round.date) || a.round.created - b.round.created);
}

/** 18-hole differential. 9-hole rounds are doubled. Missing rating falls back to par. */
export function differential(x: PlayedRound): number {
  const rating = Number(x.course.rating) || x.parTotal;
  const slope = Number(x.course.slope) || 113;
  const d = ((x.total - rating) * 113) / slope;
  return x.holes <= 9 ? d * 2 : d;
}

/**
 * Estimate modeled on WHS (best of recent 20). Not an official index:
 * no net double bogey, no PCC, no 9-hole combining across days.
 */
export function handicapEstimate(prs: PlayedRound[]): number | null {
  const ds = prs.slice(-20).map(differential).sort((a, b) => a - b);
  const n = ds.length;
  if (n < 3) return null;
  const table: Array<[number, number, number]> = [
    [3, 1, -2],
    [4, 1, -1],
    [5, 1, 0],
    [6, 2, -1],
    [8, 2, 0],
    [11, 3, 0],
    [14, 4, 0],
    [16, 5, 0],
    [18, 6, 0],
    [19, 7, 0],
    [20, 8, 0],
  ];
  const row = table.find((x) => n <= x[0]) ?? [20, 8, 0];
  const k = row[1];
  const adj = row[2];
  return Math.min(54, sum(ds.slice(0, k)) / k + adj);
}

export function perNine(x: PlayedRound): number {
  return ((x.total - x.parTotal) * 9) / x.holes;
}

export function snowStreak(prs: PlayedRound[]): number {
  let n = 0;
  for (let i = prs.length - 1; i >= 0; i--) {
    if (prs[i].scores.some((s) => s >= 8)) break;
    n += 1;
  }
  return n;
}

export function headToHead(
  me: string,
  opp: string,
  rounds: SavedRound[],
): { wins: number; losses: number; ties: number; holeWins: number; holeLosses: number; holeHalves: number } {
  let wins = 0;
  let losses = 0;
  let ties = 0;
  let holeWins = 0;
  let holeLosses = 0;
  let holeHalves = 0;
  for (const r of rounds) {
    const a = r.scores[me];
    const b = r.scores[opp];
    if (!a || !b) continue;
    const ta = sum(a);
    const tb = sum(b);
    if (ta < tb) wins += 1;
    else if (ta > tb) losses += 1;
    else ties += 1;
    a.forEach((v, i) => {
      const o = b[i];
      if (o == null) return;
      if (v < o) holeWins += 1;
      else if (v > o) holeLosses += 1;
      else holeHalves += 1;
    });
  }
  return { wins, losses, ties, holeWins, holeLosses, holeHalves };
}

export function yearOf(iso: string): number {
  return Number(iso.slice(0, 4));
}
