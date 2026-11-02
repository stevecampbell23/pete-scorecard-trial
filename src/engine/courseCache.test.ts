import { beforeEach, describe, expect, it } from "vitest";
import { getDetail, loadNearby, nearbyIsFresh, saveDetail, saveNearby } from "./courseCache";

function memoryStorage() {
  const m = new Map<string, string>();
  globalThis.localStorage = {
    getItem: (k) => m.get(k) ?? null,
    setItem: (k, v) => {
      m.set(k, v);
    },
    removeItem: (k) => {
      m.delete(k);
    },
    clear: () => m.clear(),
    key: (i) => [...m.keys()][i] ?? null,
    get length() {
      return m.size;
    },
  } as Storage;
}

describe("course cache", () => {
  beforeEach(() => memoryStorage());

  it("remembers a nearby page and a card", () => {
    saveNearby({
      hits: [{ id: "occ", name: "Owensboro Country Club" }],
      total: 51,
      radiusMi: 30,
      at: Date.now(),
    });
    expect(loadNearby()?.total).toBe(51);
    saveDetail({
      id: "occ",
      name: "Owensboro Country Club",
      par: [5, 3, 5],
      holes: 3,
      missing: [],
      tees: [],
    });
    expect(getDetail("occ")?.name).toBe("Owensboro Country Club");
  });

  it("treats yesterday as stale", () => {
    expect(nearbyIsFresh(Date.now() - 2 * 24 * 60 * 60 * 1000)).toBe(false);
    expect(nearbyIsFresh(Date.now() - 60_000)).toBe(true);
  });
});
