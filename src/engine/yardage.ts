export type Condition = "into" | "downwind" | "uphill" | "downhill" | "rough";

export const CONDITION_PCT: Record<Condition, number> = {
  into: 0.1,
  downwind: -0.1,
  uphill: 0.05,
  downhill: -0.05,
  rough: 0.05,
};

export const DEFAULT_CLUBS = [
  { name: "Driver", yards: 230 },
  { name: "3 Wood", yards: 210 },
  { name: "Hybrid", yards: 190 },
  { name: "5 Iron", yards: 175 },
  { name: "6 Iron", yards: 165 },
  { name: "7 Iron", yards: 155 },
  { name: "8 Iron", yards: 145 },
  { name: "9 Iron", yards: 135 },
  { name: "PW", yards: 125 },
  { name: "52°", yards: 110 },
  { name: "56°", yards: 90 },
];

/** Drop high/low outliers when there are enough shots, then average. */
export function typicalCarry(shots: number[]): { yards: number; used: number[]; tossed: number[] } | null {
  const sorted = [...shots].filter((n) => n > 0).sort((a, b) => a - b);
  if (!sorted.length) return null;
  let used = sorted;
  const tossed: number[] = [];
  if (sorted.length >= 6) {
    const q1 = sorted[Math.floor(sorted.length * 0.25)];
    const q3 = sorted[Math.ceil(sorted.length * 0.75) - 1];
    const iqr = q3 - q1;
    const lo = q1 - 1.5 * (iqr || 8);
    const hi = q3 + 1.5 * (iqr || 8);
    used = [];
    for (const s of sorted) {
      if (s < lo || s > hi) tossed.push(s);
      else used.push(s);
    }
    if (!used.length) used = sorted;
  }
  const yards = Math.round(used.reduce((a, b) => a + b, 0) / used.length);
  return { yards, used, tossed };
}

export function effectiveYards(pin: number, conditions: Condition[]): number {
  const pct = conditions.reduce((a, c) => a + CONDITION_PCT[c], 0);
  return Math.round(pin * (1 + pct));
}

export function pickClub(pinEffective: number, clubs: Array<{ name: string; yards: number }>): { name: string; yards: number } | null {
  if (!clubs.length) return null;
  const sorted = [...clubs].sort((a, b) => a.yards - b.yards);
  let best = sorted[0];
  for (const c of sorted) {
    if (c.yards >= pinEffective) return c;
    best = c;
  }
  return best;
}
