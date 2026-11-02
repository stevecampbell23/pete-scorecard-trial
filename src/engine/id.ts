export function uid(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return `id_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

export function todayISO(): string {
  return new Date().toLocaleDateString("en-CA");
}

export function formatDate(iso: string, opt: Intl.DateTimeFormatOptions = { month: "short", day: "numeric", year: "numeric" }): string {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1).toLocaleDateString("en-US", opt);
}

export function sum(nums: Array<number | null | undefined>): number {
  return nums.reduce<number>((a, b) => a + (b ?? 0), 0);
}

export function vsPar(strokes: number, par: number): string {
  const n = strokes - par;
  if (n === 0) return "E";
  return n > 0 ? `+${n}` : `−${Math.abs(n)}`;
}

/** Never print "You's" or "Me's". The current user gets "Your". */
export function seasonTitle(name: string, isYou: boolean, year: number): string {
  if (isYou) return `Your ${year}`;
  const trimmed = name.trim() || "Player";
  const poss = /s$/i.test(trimmed) ? `${trimmed}'` : `${trimmed}'s`;
  return `${poss} ${year}`;
}

export function possessiveName(name: string, isYou: boolean): string {
  if (isYou) return "Your";
  const trimmed = name.trim() || "Player";
  return /s$/i.test(trimmed) ? `${trimmed}'` : `${trimmed}'s`;
}
