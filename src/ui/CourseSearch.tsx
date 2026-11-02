import { useEffect, useMemo, useRef, useState } from "react";
import type { Course, TeeSet } from "../types";
import { useActions, useStore } from "../store";
import { formatMiles, haversineMi, readGps } from "../engine/geo";
import { completeness, matchesQuery, sortHits } from "../engine/courseMatch";
import { courseDetail, MORE_NEAR, nextRadius, PAGE_NEAR, searchCourses, type OgHit } from "../engine/opengolf";
import { sum } from "../engine/id";

type Hit = {
  key: string;
  name: string;
  place: string;
  type?: string;
  inBag: boolean;
  played: boolean;
  complete: boolean;
  distanceMi?: number;
  bagId?: string;
  ogid?: string;
  knownPar?: number;
  holesHint?: number;
};

function teeLabel(t: TeeSet): string {
  const g = t.gender === "Male" ? "Men" : t.gender === "Female" ? "Women" : t.gender;
  return [t.name, g].filter(Boolean).join(" · ");
}

export function CourseSearch({
  selectedId,
  onSelect,
}: {
  selectedId?: string;
  onSelect: (id: string) => void;
}) {
  const { state } = useStore();
  const actions = useActions();
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);
  const [geoBusy, setGeoBusy] = useState(false);
  const [geoErr, setGeoErr] = useState("");
  const [apiHits, setApiHits] = useState<OgHit[]>([]);
  const [apiTotal, setApiTotal] = useState(0);
  const [radiusMi, setRadiusMi] = useState(30);
  const [shownNear, setShownNear] = useState(PAGE_NEAR);
  const [err, setErr] = useState("");
  const [draft, setDraft] = useState<null | {
    name: string;
    city: string;
    par: Array<number | null>;
    missing: number[];
    tees: TeeSet[];
    teeKey?: string;
    ogid?: string;
    lat?: number;
    lng?: number;
    strokeIndex?: number[];
    source: Course["source"];
  }>(null);
  const timer = useRef(0);
  const abort = useRef<AbortController | null>(null);
  const askedGps = useRef(false);

  const fix = state.lastFix;

  async function locate() {
    setGeoBusy(true);
    setGeoErr("");
    try {
      const f = await readGps();
      actions.setFix(f);
    } catch {
      setGeoErr("Location is off. Search by name or town instead.");
    } finally {
      setGeoBusy(false);
    }
  }

  useEffect(() => {
    if (askedGps.current) return;
    askedGps.current = true;
    void locate();
  }, []);

  useEffect(() => {
    setShownNear(PAGE_NEAR);
    setRadiusMi(30);
  }, [fix?.lat, fix?.lng]);

  useEffect(() => {
    setShownNear(PAGE_NEAR);
  }, [q]);

  useEffect(() => {
    window.clearTimeout(timer.current);
    const query = q.trim();
    if (query.length === 1) return;
    timer.current = window.setTimeout(async () => {
      abort.current?.abort();
      const ac = new AbortController();
      abort.current = ac;
      setBusy(true);
      setErr("");
      try {
        const page = await searchCourses({
          q: query.length >= 2 ? query : undefined,
          lat: fix?.lat,
          lng: fix?.lng,
          limit: 50,
          radiusMi,
          signal: ac.signal,
        });
        if (!ac.signal.aborted) {
          setApiHits(page.hits);
          setApiTotal(page.total);
        }
      } catch (e) {
        if ((e as Error).name === "AbortError") return;
        setErr("Course database didn't answer. You can still add it yourself.");
      } finally {
        if (!ac.signal.aborted) setBusy(false);
      }
    }, query.length >= 2 ? 180 : 40);
    return () => window.clearTimeout(timer.current);
  }, [q, fix?.lat, fix?.lng, radiusMi]);

  const playedIds = useMemo(() => new Set(state.rounds.map((r) => r.courseId)), [state.rounds]);

  const hits: Hit[] = useMemo(() => {
    const bag: Hit[] = state.courses
      .filter((c) => !q.trim() || matchesQuery(q, c.name, c.city ?? ""))
      .map((c) => {
        const dist =
          fix && c.lat != null && c.lng != null ? haversineMi(fix, { lat: c.lat, lng: c.lng }) : undefined;
        const comp = completeness(c.par);
        return {
          key: `bag-${c.id}`,
          name: c.name,
          place: c.city ?? "",
          inBag: true,
          played: playedIds.has(c.id),
          complete: comp.missing.length === 0 && comp.holes > 0,
          distanceMi: dist,
          bagId: c.id,
          ogid: c.ogid,
          knownPar: c.par.length ? sum(c.par) : undefined,
          holesHint: c.par.length,
        };
      });
    const remote: Hit[] = apiHits
      .filter((h) => !state.courses.some((c) => c.ogid === h.id))
      .map((h) => ({
        key: `og-${h.id}`,
        name: h.name,
        place: [h.city, h.state].filter(Boolean).join(", "),
        type: h.type,
        inBag: false,
        played: false,
        complete: false,
        distanceMi:
          h.distanceMi ?? (fix && h.lat != null && h.lng != null ? haversineMi(fix, { lat: h.lat, lng: h.lng }) : undefined),
        ogid: h.id,
        knownPar: h.totalPar,
        holesHint: h.totalPar && h.totalPar <= 30 ? 9 : 18,
      }));
    return sortHits([...bag, ...remote], q);
  }, [apiHits, state.courses, q, fix, playedIds]);

  const yours = hits.filter((h) => h.inBag);
  const nearAll = hits
    .filter((h) => !h.inBag && h.distanceMi != null)
    .sort((a, b) => (a.distanceMi ?? 999) - (b.distanceMi ?? 999));
  const near = q.trim() ? nearAll.filter((h) => (h.distanceMi ?? 999) <= radiusMi) : nearAll;
  const rest = hits.filter((h) => !h.inBag && !near.some((n) => n.key === h.key));
  const shown = near.slice(0, shownNear);
  const hidden = Math.max(0, near.length - shown.length);
  const farther = nextRadius(radiusMi);

  async function pickHit(h: Hit) {
    if (h.bagId) {
      onSelect(h.bagId);
      return;
    }
    if (!h.ogid) return;
    setBusy(true);
    try {
      const d = await courseDetail(h.ogid);
      const place = [d.city, d.state].filter(Boolean).join(", ");
      const par = d.par.length ? d.par : Array(9).fill(null);
      setDraft({
        name: d.name,
        city: place,
        par,
        missing: completeness(par).missing,
        tees: d.tees,
        ogid: d.id,
        lat: d.lat,
        lng: d.lng,
        strokeIndex: d.strokeIndex,
        source: "opengolf",
      });
    } catch {
      setErr("Couldn't load that card. Add it yourself from the scorecard.");
    } finally {
      setBusy(false);
    }
  }

  function saveDraft() {
    if (!draft) return;
    const { missing } = completeness(draft.par);
    if (missing.length || draft.par.some((p) => p == null)) return;
    const tee = draft.tees.find((t) => t.key === draft.teeKey);
    const c = actions.addCourse({
      name: draft.name.trim(),
      city: draft.city.trim() || undefined,
      par: draft.par as number[],
      rating: tee?.rating,
      slope: tee?.slope,
      strokeIndex: draft.strokeIndex,
      lat: draft.lat,
      lng: draft.lng,
      ogid: draft.ogid,
      teeName: tee ? teeLabel(tee) : undefined,
      source: draft.source,
    });
    setDraft(null);
    onSelect(c.id);
  }

  if (draft) {
    const { missing } = completeness(draft.par);
    const tee = draft.tees.find((t) => t.key === draft.teeKey);
    const rated = draft.tees.filter((t) => t.rating);
    return (
      <div className="block">
        <button className="btn small ghost" type="button" onClick={() => setDraft(null)}>
          ← Search
        </button>
        <div>
          <div className="eyebrow">Check the card</div>
          <h2>{draft.name}</h2>
          <p className="note">{draft.city}</p>
        </div>
        {missing.length ? (
          <div className="banner">
            Missing par on hole{missing.length > 1 ? "s" : ""} {missing.join(", ")}. Copy them off the paper card. We will not guess 4s.
          </div>
        ) : (
          <span className="note">Card looks complete. Pick a tee if you have ratings.</span>
        )}
        {rated.length ? (
          <div className="field">
            <span>Tees</span>
            <div className="chips">
              {rated.map((t) => (
                <button
                  key={t.key}
                  className="chip"
                  type="button"
                  aria-pressed={draft.teeKey === t.key}
                  onClick={() => setDraft({ ...draft, teeKey: t.key })}
                >
                  {teeLabel(t)}
                  {t.rating ? ` · ${t.rating}/${t.slope ?? "—"}` : ""}
                </button>
              ))}
            </div>
            {tee?.yardage ? <span className="note">{tee.yardage} yards</span> : null}
          </div>
        ) : null}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(9, minmax(0,1fr))", gap: 6 }}>
          {draft.par.map((p, i) => (
            <label
              key={i}
              style={{
                display: "grid",
                gap: 2,
                textAlign: "center",
                fontSize: 11,
                color: missing.includes(i + 1) ? "var(--warn)" : "var(--muted)",
                fontWeight: 700,
              }}
            >
              {i + 1}
              <input
                type="number"
                min={3}
                max={6}
                value={p ?? ""}
                onChange={(e) => {
                  const next = [...draft.par];
                  const n = Number(e.target.value);
                  next[i] = Number.isInteger(n) ? n : null;
                  setDraft({ ...draft, par: next, missing: completeness(next).missing });
                }}
                style={{ padding: "8px 2px", textAlign: "center", minHeight: 42 }}
              />
            </label>
          ))}
        </div>
        <button className="btn solid" type="button" disabled={missing.length > 0} onClick={saveDraft}>
          Use this course
        </button>
        <span className="note">Course data © OpenStreetMap contributors via OpenGolfAPI.</span>
      </div>
    );
  }

  const selected = selectedId ? state.courses.find((c) => c.id === selectedId) : undefined;

  return (
    <div className="field">
      <div className="row" style={{ justifyContent: "space-between" }}>
        <span>Find your course</span>
        <button className="btn small ghost" type="button" onClick={() => void locate()} disabled={geoBusy}>
          {geoBusy ? "Finding you…" : fix ? "Refresh near me" : "Near me"}
        </button>
      </div>
      {fix ? (
        <span className="note">
          Using your location
          {fix.accuracyM ? ` · about ${Math.round(fix.accuracyM)} m` : ""}. Closest first.
        </span>
      ) : (
        <span className="note">{geoErr || "Turn on location and we’ll list courses by the lot."}</span>
      )}
      <input
        type="search"
        value={q}
        placeholder="Course name or town"
        autoComplete="off"
        enterKeyHint="search"
        onChange={(e) => setQ(e.target.value)}
      />
      {busy ? <span className="note">Searching…</span> : null}
      {err ? <div className="banner">{err}</div> : null}
      {selected && selected.par.length ? (
        <div className="cres selected">
          <span>
            <strong>{selected.name}</strong>
            <br />
            <span className="note">
              {selected.par.length} holes · par {sum(selected.par)}
              {selected.teeName ? ` · ${selected.teeName}` : ""}
              {selected.city ? ` · ${selected.city}` : ""}
            </span>
          </span>
          <span className="pill">Playing here</span>
        </div>
      ) : null}
      <HitList title="Your courses" hits={yours} onPick={pickHit} />
      <HitList
        title={
          !q.trim() && apiTotal > shown.length
            ? `Near you · showing ${shown.length} of ${apiTotal}`
            : "Near you"
        }
        hits={shown}
        onPick={pickHit}
      />
      {near.length || apiTotal > shown.length ? (
        <div className="row">
          {hidden > 0 ? (
            <button className="btn small ghost" type="button" onClick={() => setShownNear((n) => n + MORE_NEAR)}>
              Show more nearby · {hidden} more
            </button>
          ) : farther && !q.trim() ? (
            <button
              className="btn small ghost"
              type="button"
              disabled={busy}
              onClick={() => {
                setRadiusMi(farther);
                setShownNear((n) => n + MORE_NEAR);
              }}
            >
              Look farther · up to {farther} miles
            </button>
          ) : null}
        </div>
      ) : null}
      <HitList title={q.trim() ? "Matches" : rest.length ? "Farther away" : ""} hits={rest} onPick={pickHit} />
      {!hits.length && !busy ? (
        <span className="note">
          {q.trim().length >= 2
            ? `Nothing found for “${q}”. Try the town name, or add it yourself.`
            : "Search a name or tap Near me."}
        </span>
      ) : null}
      <ManualAdd
        seedName={q}
        onSaved={(id) => {
          setQ("");
          onSelect(id);
        }}
      />
      <span className="note">Course search © OpenStreetMap contributors via OpenGolfAPI (ODbL).</span>
    </div>
  );
}

function HitList({ title, hits, onPick }: { title: string; hits: Hit[]; onPick: (h: Hit) => void }) {
  if (!hits.length) return null;
  return (
    <div className="field">
      <span>{title}</span>
      {hits.map((h) => (
        <button key={h.key} className="cres" type="button" onClick={() => onPick(h)}>
          <span>
            <strong>{h.name}</strong>
            <br />
            <span className="note">
              {[
                h.place,
                h.type,
                h.distanceMi != null ? formatMiles(h.distanceMi) : "",
                h.holesHint ? `${h.holesHint} holes` : "",
                h.knownPar ? `par ${h.knownPar}` : "",
                h.complete ? "card complete" : h.inBag ? "" : "check the card",
              ]
                .filter(Boolean)
                .join(" · ")}
            </span>
          </span>
          <span className="pill">{h.inBag ? (h.played ? "Played" : "Saved") : "Use"}</span>
        </button>
      ))}
    </div>
  );
}

function ManualAdd({ seedName, onSaved }: { seedName: string; onSaved: (id: string) => void }) {
  const actions = useActions();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(seedName);
  const [city, setCity] = useState("");
  const [holes, setHoles] = useState(9);
  const [pars, setPars] = useState<Array<number | null>>(Array(9).fill(null));

  if (!open) {
    return (
      <button
        className="btn small ghost"
        type="button"
        onClick={() => {
          setName(seedName);
          setOpen(true);
        }}
      >
        Add it myself
      </button>
    );
  }
  const { missing } = completeness(pars);
  return (
    <div style={{ display: "grid", gap: 12, borderTop: "1px solid var(--line)", paddingTop: 14 }}>
      <label className="field">
        <span>Course name</span>
        <input value={name} onChange={(e) => setName(e.target.value)} maxLength={40} />
      </label>
      <label className="field">
        <span>Town</span>
        <input value={city} onChange={(e) => setCity(e.target.value)} maxLength={40} />
      </label>
      <div className="chips">
        {[9, 18].map((n) => (
          <button
            key={n}
            className="chip"
            type="button"
            aria-pressed={holes === n}
            onClick={() => {
              setHoles(n);
              setPars(Array(n).fill(null));
            }}
          >
            {n} holes
          </button>
        ))}
      </div>
      <span className="note">Copy par from the scorecard. Blank holes will not be filled in as 4.</span>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(9, minmax(0,1fr))", gap: 6 }}>
        {pars.map((p, i) => (
          <label key={i} style={{ display: "grid", gap: 2, textAlign: "center", fontSize: 11, color: "var(--muted)", fontWeight: 700 }}>
            {i + 1}
            <input
              type="number"
              min={3}
              max={6}
              value={p ?? ""}
              onChange={(e) => {
                const next = [...pars];
                const n = Number(e.target.value);
                next[i] = Number.isInteger(n) ? n : null;
                setPars(next);
              }}
              style={{ padding: "8px 2px", textAlign: "center", minHeight: 42 }}
            />
          </label>
        ))}
      </div>
      <div className="row">
        <button
          className="btn solid small"
          type="button"
          disabled={!name.trim() || missing.length > 0}
          onClick={() => {
            const c = actions.addCourse({
              name: name.trim(),
              city: city.trim() || undefined,
              par: pars as number[],
              source: "typed",
            });
            setOpen(false);
            onSaved(c.id);
          }}
        >
          Save course
        </button>
        <button className="btn small ghost" type="button" onClick={() => setOpen(false)}>
          Cancel
        </button>
      </div>
    </div>
  );
}
