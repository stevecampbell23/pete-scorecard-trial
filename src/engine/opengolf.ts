import { completeness } from "./courseMatch";
import type { TeeSet } from "../types";

const BASE = "https://api.opengolfapi.org/v1";

export type OgHit = {
  id: string;
  name: string;
  city?: string;
  state?: string;
  type?: string;
  lat?: number;
  lng?: number;
  distanceMi?: number;
  totalPar?: number;
};

export type OgDetail = OgHit & {
  par: Array<number | null>;
  holes: number;
  missing: number[];
  tees: TeeSet[];
  strokeIndex?: number[];
};

async function getJson(path: string, signal?: AbortSignal): Promise<unknown> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 10000);
  const onAbort = () => ctrl.abort();
  signal?.addEventListener("abort", onAbort);
  try {
    const r = await fetch(`${BASE}${path}`, {
      signal: ctrl.signal,
      headers: { accept: "application/json" },
    });
    if (!r.ok) throw new Error(`opengolf ${r.status}`);
    return r.json();
  } finally {
    clearTimeout(t);
    signal?.removeEventListener("abort", onAbort);
  }
}

function asHit(c: Record<string, unknown>): OgHit | null {
  const id = String(c.id ?? "");
  const name = String(c.name ?? c.course_name ?? "");
  if (!id || !name) return null;
  const lat = Number(c.latitude ?? c.lat);
  const lng = Number(c.longitude ?? c.lng);
  const dist = Number(c.distance_mi);
  const par = Number(c.par);
  return {
    id,
    name,
    city: c.city ? String(c.city) : undefined,
    state: c.state ? String(c.state) : undefined,
    type: c.type ? String(c.type) : undefined,
    lat: Number.isFinite(lat) ? lat : undefined,
    lng: Number.isFinite(lng) ? lng : undefined,
    distanceMi: Number.isFinite(dist) ? dist : undefined,
    totalPar: Number.isFinite(par) ? par : undefined,
  };
}

export type SearchPage = { hits: OgHit[]; total: number };

async function oneSearch(p: URLSearchParams, signal?: AbortSignal): Promise<SearchPage> {
  const j = (await getJson(`/courses/search?${p}`, signal)) as { courses?: Record<string, unknown>[]; total?: number };
  const hits = (j.courses ?? []).map(asHit).filter((x): x is OgHit => Boolean(x));
  const total = Number(j.total);
  return { hits, total: Number.isFinite(total) && total > 0 ? total : hits.length };
}

function mergeHits(lists: OgHit[][]): OgHit[] {
  const byId = new Map<string, OgHit>();
  for (const list of lists) {
    for (const h of list) {
      const prev = byId.get(h.id);
      if (!prev) {
        byId.set(h.id, h);
        continue;
      }
      byId.set(h.id, {
        ...prev,
        ...h,
        distanceMi: h.distanceMi ?? prev.distanceMi,
      });
    }
  }
  return [...byId.values()];
}

async function fillPages(base: URLSearchParams, signal?: AbortSignal, cap = 80): Promise<SearchPage> {
  const first = await oneSearch(base, signal);
  let hits = first.hits;
  const total = first.total;
  while (hits.length < total && hits.length < cap) {
    const p = new URLSearchParams(base);
    p.set("offset", String(hits.length));
    const more = await oneSearch(p, signal);
    if (!more.hits.length) break;
    const before = hits.length;
    hits = mergeHits([hits, more.hits]);
    if (hits.length <= before) break;
  }
  return { hits, total };
}

export async function searchCourses(opts: {
  q?: string;
  lat?: number;
  lng?: number;
  limit?: number;
  radiusMi?: number;
  signal?: AbortSignal;
}): Promise<SearchPage> {
  const limit = String(opts.limit ?? 50);
  const jobs: Promise<SearchPage>[] = [];
  const q = opts.q?.trim().slice(0, 60);
  const geo = opts.lat != null && opts.lng != null;
  if (q) {
    const p = new URLSearchParams({ q, limit });
    jobs.push(oneSearch(p, opts.signal));
  }
  if (geo) {
    const p = new URLSearchParams({ lat: String(opts.lat), lng: String(opts.lng), limit });
    p.set("radius_mi", String(opts.radiusMi ?? 30));
    jobs.push(fillPages(p, opts.signal, 80));
  }
  if (!jobs.length) return { hits: [], total: 0 };
  const settled = await Promise.allSettled(jobs);
  const pages = settled.filter((s): s is PromiseFulfilledResult<SearchPage> => s.status === "fulfilled").map((s) => s.value);
  if (!pages.length) throw new Error("opengolf search failed");
  const geoTotal = geo ? pages[pages.length - 1]?.total ?? 0 : 0;
  return { hits: mergeHits(pages.map((p) => p.hits)), total: q ? mergeHits(pages.map((p) => p.hits)).length : geoTotal };
}

function parFromRows(rows: Record<string, unknown>[], holesHint?: number): Array<number | null> {
  const byHole = new Map<number, number | null>();
  for (const h of rows) {
    const n = Number(h.hole ?? h.number ?? h.hole_number);
    const p = Number(h.par);
    if (n >= 1 && n <= 18) byHole.set(n, Number.isInteger(p) && p >= 3 && p <= 6 ? p : null);
  }
  const hint = holesHint === 9 || holesHint === 18 ? holesHint : 0;
  let len = hint || (byHole.size > 9 ? 18 : byHole.size > 0 ? 9 : 0);
  if (!len) return [];
  return Array.from({ length: len }, (_, i) => byHole.get(i + 1) ?? null);
}

function fillPar(base: Array<number | null>, extra: Array<number | null>): Array<number | null> {
  const len = Math.max(base.length, extra.length);
  if (!len) return extra.length ? extra : base;
  return Array.from({ length: len }, (_, i) => {
    const a = base[i];
    const b = extra[i];
    if (a != null) return a;
    return b ?? null;
  });
}

export async function courseDetail(id: string, signal?: AbortSignal): Promise<OgDetail> {
  const raw = (await getJson(`/courses/${encodeURIComponent(id)}`, signal)) as Record<string, unknown>;
  const hit = asHit(raw);
  if (!hit) throw new Error("bad course");
  const holesN = Number(raw.holes ?? raw.hole_count);
  let par = parFromRows(Array.isArray(raw.scorecard) ? (raw.scorecard as Record<string, unknown>[]) : [], holesN);
  let tees: TeeSet[] = [];
  let strokeIndex: number[] | undefined;
  try {
    const tjson = (await getJson(`/courses/${encodeURIComponent(id)}/tees`, signal)) as { tees?: Record<string, unknown>[] };
    tees = (tjson.tees ?? [])
      .map((t) => ({
        key: String(t.tee_key ?? t.tee_name ?? ""),
        name: String(t.tee_name ?? "Tee"),
        gender: t.gender ? String(t.gender) : undefined,
        rating: Number.isFinite(Number(t.course_rating)) ? Number(t.course_rating) : undefined,
        slope: Number.isFinite(Number(t.slope)) ? Number(t.slope) : undefined,
        yardage: Number.isFinite(Number(t.yardage)) ? Number(t.yardage) : undefined,
        par: Number.isFinite(Number(t.par)) ? Number(t.par) : undefined,
      }))
      .filter((t) => t.key || t.name);
  } catch {
    tees = [];
  }
  try {
    const hjson = (await getJson(`/courses/${encodeURIComponent(id)}/holes`, signal)) as { holes?: Record<string, unknown>[] };
    const holes = hjson.holes ?? [];
    par = fillPar(par, parFromRows(holes, holesN || par.length));
    const idx = holes.map((h) => Number(h.handicap_index ?? h.stroke_index));
    if (idx.length === par.length && idx.every((n) => n >= 1 && n <= 18)) strokeIndex = idx;
  } catch {
    /* holes are extra */
  }
  if (!par.length) par = Array(holesN === 18 ? 18 : 9).fill(null);
  const { missing } = completeness(par);
  return { ...hit, par, holes: par.length, missing, tees, strokeIndex };
}

export { mergeHits };

export const PAGE_NEAR = 8;
export const MORE_NEAR = 12;

export function nextRadius(mi: number): number | null {
  if (mi < 60) return 60;
  if (mi < 120) return 120;
  return null;
}
