import { describe, expect, it } from "vitest";
import { mergeHits } from "./opengolf";

describe("search merge", () => {
  it("keeps a named hit that is not nearby, and the nearby distance on a duplicate", () => {
    const named = [{ id: "pebble", name: "Pebble Beach", city: "Pebble Beach", state: "CA" }];
    const near = [
      { id: "occ", name: "Owensboro Country Club", city: "Owensboro", state: "KY", distanceMi: 2.4 },
      { id: "pebble", name: "Pebble Beach", city: "Pebble Beach", state: "CA", distanceMi: 1900 },
    ];
    const merged = mergeHits([named, near]);
    expect(merged).toHaveLength(2);
    expect(merged.find((h) => h.id === "pebble")?.distanceMi).toBe(1900);
    expect(merged.find((h) => h.id === "occ")?.distanceMi).toBe(2.4);
  });
});
