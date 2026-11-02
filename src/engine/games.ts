import { SNOWMAN } from "./scoring";
import { sum } from "./id";

export type Ledger = Record<string, number>;

function emptyLedger(ids: string[]): Ledger {
  return Object.fromEntries(ids.map((id) => [id, 0]));
}

function add(ledger: Ledger, from: string, to: string, amount: number) {
  if (from === to || amount === 0) return;
  ledger[from] -= amount;
  ledger[to] += amount;
}

/** Lowest unique score wins the hole. Ties optionally carry. */
export function skins(
  ids: string[],
  scores: Record<string, number[]>,
  value: number,
  carry: boolean,
): Ledger {
  const ledger = emptyLedger(ids);
  const holes = scores[ids[0]]?.length ?? 0;
  let pot = value;
  for (let h = 0; h < holes; h++) {
    const byScore = new Map<number, string[]>();
    for (const id of ids) {
      const s = scores[id][h];
      byScore.set(s, [...(byScore.get(s) ?? []), id]);
    }
    const low = Math.min(...[...byScore.keys()]);
    const winners = byScore.get(low) ?? [];
    if (winners.length === 1) {
      const winner = winners[0];
      for (const id of ids) if (id !== winner) add(ledger, id, winner, pot);
      pot = value;
    } else if (carry) {
      pot += value;
    } else {
      pot = value;
    }
  }
  return ledger;
}

/**
 * 9-hole Nassau: 1–3, 4–6, 7–9.
 * 18-hole Nassau: front, back, overall.
 * Everybody vs everybody, most holes won (or lower total on overall for 18).
 */
export function nassau(ids: string[], scores: Record<string, number[]>, value: number): Ledger {
  const ledger = emptyLedger(ids);
  const holes = scores[ids[0]]?.length ?? 0;
  const segments: Array<[number, number, "holes" | "total"]> =
    holes > 9
      ? [
          [0, 9, "holes"],
          [9, holes, "holes"],
          [0, holes, "total"],
        ]
      : [
          [0, Math.min(3, holes), "holes"],
          [3, Math.min(6, holes), "holes"],
          [6, holes, "holes"],
        ];

  for (const [a, b, mode] of segments) {
    if (a >= b) continue;
    for (let i = 0; i < ids.length; i++) {
      for (let j = i + 1; j < ids.length; j++) {
        const p = ids[i];
        const q = ids[j];
        let pw = 0;
        let qw = 0;
        if (mode === "total") {
          const pt = sum(scores[p].slice(a, b));
          const qt = sum(scores[q].slice(a, b));
          if (pt < qt) add(ledger, q, p, value);
          else if (qt < pt) add(ledger, p, q, value);
        } else {
          for (let h = a; h < b; h++) {
            if (scores[p][h] < scores[q][h]) pw += 1;
            else if (scores[q][h] < scores[p][h]) qw += 1;
          }
          if (pw > qw) add(ledger, q, p, value);
          else if (qw > pw) add(ledger, p, q, value);
        }
      }
    }
  }
  return ledger;
}

export function strokePlay(ids: string[], scores: Record<string, number[]>): Ledger {
  const ledger = emptyLedger(ids);
  for (let i = 0; i < ids.length; i++) {
    for (let j = i + 1; j < ids.length; j++) {
      const p = ids[i];
      const q = ids[j];
      const d = sum(scores[p]) - sum(scores[q]);
      if (d > 0) add(ledger, p, q, d);
      else if (d < 0) add(ledger, q, p, -d);
    }
  }
  return ledger;
}

export function snowmanPays(ids: string[], scores: Record<string, number[]>, value: number): Ledger {
  const ledger = emptyLedger(ids);
  const holes = scores[ids[0]]?.length ?? 0;
  for (let h = 0; h < holes; h++) {
    for (const id of ids) {
      if (scores[id][h] >= SNOWMAN) {
        for (const other of ids) if (other !== id) add(ledger, id, other, value);
      }
    }
  }
  return ledger;
}

export function combine(parts: Ledger[]): Ledger {
  const ids = new Set(parts.flatMap((p) => Object.keys(p)));
  const ledger = emptyLedger([...ids]);
  for (const part of parts) {
    for (const [k, v] of Object.entries(part)) ledger[k] += v;
  }
  return ledger;
}

export function settlementSummary(ledger: Ledger, names: Record<string, string>): { headline: string; lines: string[] } {
  const entries = Object.entries(ledger).sort((a, b) => b[1] - a[1]);
  if (!entries.length || entries.every(([, v]) => Math.abs(v) < 0.01)) {
    return { headline: "All square", lines: ["Nobody owes anybody."] };
  }
  const winner = entries[0];
  const loser = entries[entries.length - 1];
  const headline =
    entries.filter(([, v]) => v > 0).length === 1
      ? `${names[loser[0]]} pays ${names[winner[0]]}`
      : "Settle up";
  return {
    headline,
    lines: entries.map(([id, v]) => `${names[id]}: ${v > 0 ? "+" : ""}${formatAmt(v)}`),
  };
}

export function formatAmt(n: number, mode: "points" | "dollars" = "points"): string {
  const rounded = Math.round(n * 100) / 100;
  if (mode === "dollars") {
    const sign = rounded < 0 ? "-" : "";
    return `${sign}$${Math.abs(rounded).toFixed(rounded % 1 ? 2 : 0)}`;
  }
  const label = Math.abs(rounded) === 1 ? "pt" : "pts";
  return `${rounded} ${label}`;
}
