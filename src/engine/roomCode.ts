const ALPHA = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function makeRoomCode(): string {
  const bytes = new Uint8Array(4);
  crypto.getRandomValues(bytes);
  return [...bytes].map((b) => ALPHA[b % ALPHA.length]).join("");
}

export function normalizeRoomCode(raw: string): string {
  return raw.toUpperCase().replace(/[^A-Z2-9]/g, "").slice(0, 4);
}

export function peerIdFor(code: string): string {
  return `petetrial${normalizeRoomCode(code)}`;
}

export function groupUrl(code: string, href = typeof window !== "undefined" ? window.location.href : "https://example.test/"): string {
  const u = new URL(href);
  u.hash = `g=${normalizeRoomCode(code)}`;
  return u.toString();
}

export function codeFromHash(hash = ""): string | null {
  const m = hash.match(/g=([A-Za-z0-9]+)/);
  if (!m) return null;
  const c = normalizeRoomCode(m[1]);
  return c.length === 4 ? c : null;
}
