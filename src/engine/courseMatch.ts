const STOP = new Set(["golf", "course", "club", "country", "the", "at", "of", "and", "municipal", "muni", "cc", "gc"]);

const ALIAS: Record<string, string> = {
  cc: "country",
  gc: "golf",
  muni: "municipal",
  bg: "bowling",
};

export function tokens(raw: string): string[] {
  return raw
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => ALIAS[w] ?? w)
    .filter((w) => !STOP.has(w) || w.length > 8);
}

export function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  const row = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let prev = row[0];
    row[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const tmp = row[j];
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      row[j] = Math.min(row[j] + 1, row[j - 1] + 1, prev + cost);
      prev = tmp;
    }
  }
  return row[b.length];
}

function tokenHits(query: string[], hay: string[]): boolean {
  return query.every((q) =>
    hay.some((h) => {
      if (h === q || h.startsWith(q) || q.startsWith(h)) return true;
      if (q.length >= 4 && h.length >= 4 && levenshtein(q, h) <= 1) return true;
      return false;
    }),
  );
}

export function matchesQuery(query: string, name: string, place = ""): boolean {
  const q = tokens(query);
  if (!q.length) return true;
  const hay = [...tokens(name), ...tokens(place)];
  const hits = q.filter((t) => tokenHits([t], hay));
  if (q.length === 1) return hits.length === 1;
  return hits.length >= Math.max(1, q.length - 1);
}

export function completeness(par: Array<number | null | undefined>): { known: number; holes: number; missing: number[] } {
  const holes = par.length;
  const missing: number[] = [];
  par.forEach((p, i) => {
    if (!Number.isInteger(p) || (p as number) < 3 || (p as number) > 6) missing.push(i + 1);
  });
  return { known: holes - missing.length, holes, missing };
}

export type Ranked = {
  key: string;
  inBag: boolean;
  played: boolean;
  complete: boolean;
  distanceMi?: number;
  name: string;
  place: string;
};

/** Higher is better. Bag and played always beat a random OSM hit. */
export function rankScore(r: Ranked, query: string): number {
  let n = 0;
  if (r.inBag) n += 1000;
  if (r.played) n += 400;
  if (r.complete) n += 80;
  if (r.distanceMi != null) n += Math.max(0, 250 - r.distanceMi * 10);
  if (query.trim()) {
    const q = tokens(query);
    const hay = [...tokens(r.name), ...tokens(r.place)];
    q.forEach((t) => {
      if (hay.some((h) => h === t)) n += 40;
      else if (hay.some((h) => h.startsWith(t))) n += 20;
    });
  }
  return n;
}

export function sortHits<T extends Ranked>(hits: T[], query: string): T[] {
  return [...hits].sort((a, b) => {
    const d = rankScore(b, query) - rankScore(a, query);
    if (d) return d;
    const ad = a.distanceMi ?? 9999;
    const bd = b.distanceMi ?? 9999;
    if (ad !== bd) return ad - bd;
    return a.name.localeCompare(b.name);
  });
}
