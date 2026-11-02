import type { OgDetail, OgHit } from "./opengolf";

const KEY = "peteScorecard.trial.cache.v1";
const MAX_DETAILS = 40;

export type SearchCache = {
  hits: OgHit[];
  total: number;
  radiusMi: number;
  lat?: number;
  lng?: number;
  at: number;
};

type Disk = {
  nearby?: SearchCache;
  details: Record<string, OgDetail>;
  order: string[];
};

function empty(): Disk {
  return { details: {}, order: [] };
}

function read(): Disk {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return empty();
    const p = JSON.parse(raw) as Disk;
    return { nearby: p.nearby, details: p.details ?? {}, order: p.order ?? [] };
  } catch {
    return empty();
  }
}

function write(d: Disk) {
  try {
    localStorage.setItem(KEY, JSON.stringify(d));
  } catch {
    /* quota */
  }
}

export function loadNearby(): SearchCache | null {
  const n = read().nearby;
  if (!n?.hits?.length) return null;
  return n;
}

export function saveNearby(page: SearchCache) {
  const d = read();
  d.nearby = page;
  write(d);
}

export function getDetail(id: string): OgDetail | null {
  return read().details[id] ?? null;
}

export function saveDetail(d: OgDetail) {
  const disk = read();
  disk.details[d.id] = d;
  disk.order = [d.id, ...disk.order.filter((x) => x !== d.id)].slice(0, MAX_DETAILS);
  const keep = new Set(disk.order);
  for (const k of Object.keys(disk.details)) if (!keep.has(k)) delete disk.details[k];
  write(disk);
}

export function nearbyIsFresh(at: number, maxAgeMs = 24 * 60 * 60 * 1000): boolean {
  return Date.now() - at < maxAgeMs;
}
