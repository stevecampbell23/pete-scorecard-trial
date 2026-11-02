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

/** Real card par only. Never invent a 4. */
export function holePar(n: number | null | undefined): number | null {
  return Number.isInteger(n) && (n as number) >= 3 && (n as number) <= 6 ? (n as number) : null;
}

export function bumpScore(current: number | null, par: number | null | undefined, delta: number): number {
  const hint = holePar(par);
  const base = current ?? hint;
  if (base == null) return clampScore(delta >= 0 ? 1 : 1);
  return clampScore(base + delta);
}

/** Next hole: if nothing was entered, lock the real par. Jumping holes does not call this. */
export function commitIfEmpty(current: number | null, par: number | null | undefined): number | null {
  if (current != null) return current;
  return holePar(par);
}

export function allHolesRecorded(live: LiveRound): boolean {
  return live.playerIds.every((pid) => live.scores[pid]?.every((s) => s != null));
}

export function toSavedScores(live: LiveRound, par: number[]): Record<string, number[]> {
  const out: Record<string, number[]> = {};
  for (const pid of live.playerIds) {
    out[pid] = (live.scores[pid] ?? []).map((s, i) => {
      const next = commitIfEmpty(s, par[i]);
      if (next == null) throw new Error("Cannot save a hole with no score and no par.");
      return next;
    });
  }
  return out;
}

export function mixFor(scores: number[], par: number[]) {
  const m = { birdie: 0, par: 0, bogey: 0, double: 0, triple: 0, snow: 0 };
  scores.forEach((s, i) => {
    const k = holeKind(s, holePar(par[i]) ?? s);
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
  const birdies = scores.filter((s, i) => {
    const p = holePar(par[i]);
    return p != null && s < p;
  }).length;
  if (isBest && !snowHoles.length) return "New personal best. Frame it.";
  if (isBest) return "Personal best. Snowman and all.";
  if (snowHoles.length > 1) return `Snowmen on ${snowHoles.join(" & ")}. Pete saw that.`;
  if (snowHoles.length) return `Snowman on ${snowHoles[0]}. Pete saw that.`;
  if (birdies) return `${birdies > 1 ? `${birdies} birdies` : "A birdie"} and no snowmen. Pete approves.`;
  return "Clean card. No snowmen.";
}
