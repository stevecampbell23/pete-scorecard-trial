import { describe, expect, it } from "vitest";
import { completeness, matchesQuery, rankScore, tokens } from "./courseMatch";

describe("course match", () => {
  it("ignores golf/club filler and matches nicknames", () => {
    expect(matchesQuery("paul walker", "Paul Walker Municipal Golf Course", "Bowling Green KY")).toBe(true);
    expect(matchesQuery("ben hawes par 3", "Par 3 At Ben Hawes State Park", "Owensboro")).toBe(true);
    expect(matchesQuery("mcc madisonville", "Madisonville Country Club", "Madisonville KY")).toBe(true);
  });

  it("allows a one-letter typo on longer tokens", () => {
    expect(matchesQuery("walkr", "Paul Walker Municipal Golf Course", "Bowling Green")).toBe(true);
    expect(matchesQuery("owensbro", "Owensboro Country Club", "Owensboro KY")).toBe(true);
  });

  it("does not invent pars", () => {
    const c = completeness([4, 5, null, 4, 4, 5, 4, 3, 4]);
    expect(c.known).toBe(8);
    expect(c.missing).toEqual([3]);
  });

  it("ranks bag and nearby above a distant database hit", () => {
    const bag = rankScore({ key: "a", inBag: true, played: true, complete: true, name: "Paul Walker", place: "BG" }, "");
    const near = rankScore({ key: "b", inBag: false, played: false, complete: true, distanceMi: 4, name: "Hillcrest", place: "Owensboro" }, "");
    const far = rankScore({ key: "c", inBag: false, played: false, complete: false, distanceMi: 80, name: "Hillcrest", place: "Elsewhere" }, "");
    expect(bag).toBeGreaterThan(near);
    expect(near).toBeGreaterThan(far);
  });

  it("drops stopwords", () => {
    expect(tokens("The Country Club of Owensboro")).toContain("owensboro");
    expect(tokens("The Country Club of Owensboro")).not.toContain("club");
  });
});
