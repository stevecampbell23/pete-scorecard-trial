import type { HoleKind, LiveRound } from "../types";
import { sum } from "./id";

export const MIN_SCORE = 1;
export const MAX_SCORE = 15;
export const SNOWMAN = 8;

export function holeKind(score: number, par: number): HoleKind {
  if (score >= SNOWMAN) return "snow";
  const d = score - par;
  if (d <= -2) return "eagle";
  if (d === -1) return "birdie";
  if (d === 0) return "par";
  if (d === 1) return "bogey";
  if (d === 2) return "double";
  return "triple";
}

export function clampScore(n: number): number {
  return Math.max(MIN_SCORE, Math.min(MAX_SCORE, n));
}

export function recordedHoles(scores: Array<number | null>): number[] {
  return scores.filter((s): s is number => s != null);
}

export function thruLine(scores: Array<number | null>, par: number[]): { holes: number; strokes: number; vs: number } {
  let holes = 0;
  let strokes = 0;
  let vs = 0;
  scores.forEach((s, i) => {
    if (s == null) return;
    holes += 1;
    strokes += s;
    vs += s - (par[i] ?? 0);
  });
  return { holes, strokes, vs };
}

export function bumpScore(current: number | null, par: number, delta: number): number {
  const base = current ?? par;
  return clampScore(base + delta);
}

/** Next hole: if nothing was entered, lock par. Jumping holes does not call this. */
export function commitIfEmpty(current: number | null, par: number): number {
  return current ?? par;
}

export function allHolesRecorded(live: LiveRound): boolean {
  return live.playerIds.every((pid) => live.scores[pid]?.every((s) => s != null));
}

export function toSavedScores(live: LiveRound, par: number[]): Record<string, number[]> {
  const out: Record<string, number[]> = {};
  for (const pid of live.playerIds) {
    out[pid] = (live.scores[pid] ?? []).map((s, i) => commitIfEmpty(s, par[i] ?? 4));
  }
  return out;
}

export function mixFor(scores: number[], par: number[]) {
  const m = { birdie: 0, par: 0, bogey: 0, double: 0, triple: 0, snow: 0 };
  scores.forEach((s, i) => {
    const k = holeKind(s, par[i] ?? 4);
    if (k === "eagle" || k === "birdie") m.birdie += 1;
    else if (k === "par") m.par += 1;
    else if (k === "bogey") m.bogey += 1;
    else if (k === "double") m.double += 1;
    else if (k === "snow") m.snow += 1;
    else m.triple += 1;
  });
  return m;
}

export function snowCount(scores: number[]): number {
  return scores.filter((s) => s >= SNOWMAN).length;
}

export function roundTotal(scores: number[]): number {
  return sum(scores);
}

export function verdict(scores: number[], par: number[], isBest: boolean): string {
  const snowHoles = scores.map((s, i) => (s >= SNOWMAN ? i + 1 : 0)).filter(Boolean);
  const birdies = scores.filter((s, i) => s < (par[i] ?? 4)).length;
  if (isBest && !snowHoles.length) return "New personal best. Frame it.";
  if (isBest) return "Personal best. Snowman and all.";
  if (snowHoles.length > 1) return `Snowmen on ${snowHoles.join(" & ")}. Pete saw that.`;
  if (snowHoles.length) return `Snowman on ${snowHoles[0]}. Pete saw that.`;
  if (birdies) return `${birdies > 1 ? `${birdies} birdies` : "A birdie"} and no snowmen. Pete approves.`;
  return "Clean card. No snowmen.";
}
