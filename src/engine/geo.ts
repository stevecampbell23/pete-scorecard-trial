export type Fix = { lat: number; lng: number; at: number; accuracyM?: number };

const R_MI = 3958.8;

export function haversineMi(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R_MI * Math.asin(Math.min(1, Math.sqrt(s)));
}

export function formatMiles(mi: number): string {
  if (mi < 0.1) return "here";
  if (mi < 10) return `${mi.toFixed(1)} mi`;
  return `${Math.round(mi)} mi`;
}

function fromPos(pos: GeolocationPosition): Fix {
  return {
    lat: pos.coords.latitude,
    lng: pos.coords.longitude,
    at: Date.now(),
    accuracyM: pos.coords.accuracy,
  };
}

/** First fix fast, then watch a few seconds if the phone is still vague. */
export function readGps(): Promise<Fix> {
  return new Promise((resolve, reject) => {
    if (!("geolocation" in navigator)) {
      reject(new Error("This browser has no location."));
      return;
    }
    const opts: PositionOptions = { enableHighAccuracy: true, timeout: 12000, maximumAge: 2 * 60 * 1000 };
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const first = fromPos(pos);
        if ((first.accuracyM ?? 9999) <= 80) {
          resolve(first);
          return;
        }
        let best = first;
        const watch = navigator.geolocation.watchPosition(
          (p) => {
            const next = fromPos(p);
            if ((next.accuracyM ?? 9999) < (best.accuracyM ?? 9999)) best = next;
            if ((best.accuracyM ?? 9999) <= 50) {
              navigator.geolocation.clearWatch(watch);
              resolve(best);
            }
          },
          () => {},
          opts,
        );
        window.setTimeout(() => {
          navigator.geolocation.clearWatch(watch);
          resolve(best);
        }, 5000);
      },
      (err) => reject(err),
      opts,
    );
  });
}
