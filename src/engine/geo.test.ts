import { describe, expect, it } from "vitest";
import { formatMiles, haversineMi } from "./geo";

describe("geo", () => {
  it("puts Owensboro about 4 miles from Ben Hawes, not 40", () => {
    const town = { lat: 37.774, lng: -87.113 };
    const hawes = { lat: 37.797, lng: -87.174 };
    const mi = haversineMi(town, hawes);
    expect(mi).toBeGreaterThan(2);
    expect(mi).toBeLessThan(8);
  });

  it("formats short walks as here", () => {
    expect(formatMiles(0.04)).toBe("here");
    expect(formatMiles(1.24)).toBe("1.2 mi");
    expect(formatMiles(18.4)).toBe("18 mi");
  });
});
