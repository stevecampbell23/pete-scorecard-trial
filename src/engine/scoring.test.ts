import { describe, expect, it } from "vitest";
import { bumpScore, commitIfEmpty, holeKind, thruLine } from "./scoring";
import { seasonTitle } from "./id";
import { skins, nassau, snowmanPays, strokePlay } from "./games";
import { typicalCarry, effectiveYards, pickClub } from "./yardage";
import { handicapEstimate, type PlayedRound } from "./handicap";

describe("scoring", () => {
  it("does not treat an unplayed hole as recorded", () => {
    const thru = thruLine([4, null, 5], [4, 4, 4]);
    expect(thru.holes).toBe(2);
    expect(thru.strokes).toBe(9);
  });

  it("only commits par when Next is pressed", () => {
    expect(commitIfEmpty(null, 4)).toBe(4);
    expect(commitIfEmpty(6, 4)).toBe(6);
  });

  it("first tap from empty starts at par then moves", () => {
    expect(bumpScore(null, 4, 1)).toBe(5);
    expect(bumpScore(null, 4, -1)).toBe(3);
  });

  it("marks 8+ as a snowman even on a par 5", () => {
    expect(holeKind(8, 5)).toBe("snow");
    expect(holeKind(3, 4)).toBe("birdie");
  });
});

describe("copy", () => {
  it("never says You's", () => {
    expect(seasonTitle("You", true, 2026)).toBe("Your 2026");
    expect(seasonTitle("Dale", false, 2026)).toBe("Dale's 2026");
    expect(seasonTitle("Chris", false, 2026)).toBe("Chris' 2026");
  });
});

describe("games", () => {
  it("awards a skin to the unique low score", () => {
    const ledger = skins(
      ["a", "b"],
      { a: [4, 4, 4], b: [5, 5, 5] },
      1,
      false,
    );
    expect(ledger.a).toBe(3);
    expect(ledger.b).toBe(-3);
  });

  it("carries a tied skin", () => {
    const ledger = skins(
      ["a", "b"],
      { a: [4, 4, 3], b: [4, 5, 4] },
      1,
      true,
    );
    // hole 1 tie carries 1, hole 2 a wins pot 2, hole 3 a wins 1 → a +3
    expect(ledger.a).toBe(3);
    expect(ledger.b).toBe(-3);
  });

  it("nassau on 9 holes uses 3-3-3", () => {
    const ledger = nassau(
      ["a", "b"],
      { a: [4, 4, 4, 5, 5, 5, 3, 3, 3], b: [5, 5, 5, 4, 4, 4, 3, 3, 4] },
      1,
    );
    // front 3: a, mid 3: b, last 3: a (one hole) → a +1
    expect(ledger.a).toBe(1);
    expect(ledger.b).toBe(-1);
  });

  it("snowman pays everybody", () => {
    const ledger = snowmanPays(["a", "b"], { a: [8, 4], b: [4, 4] }, 1);
    expect(ledger.a).toBe(-1);
    expect(ledger.b).toBe(1);
  });

  it("stroke play is the difference", () => {
    const ledger = strokePlay(["a", "b"], { a: [40], b: [36] });
    expect(ledger.a).toBe(-4);
    expect(ledger.b).toBe(4);
  });
});

describe("yardage", () => {
  it("tosses wild outliers", () => {
    const r = typicalCarry([70, 140, 142, 144, 145, 145, 146, 148, 150, 190]);
    expect(r).not.toBeNull();
    expect(r!.tossed).toContain(70);
    expect(r!.tossed).toContain(190);
    expect(r!.yards).toBe(145);
  });

  it("applies wind as a percent, not weather magic", () => {
    expect(effectiveYards(150, ["into"])).toBe(165);
    expect(pickClub(165, [{ name: "7 Iron", yards: 155 }, { name: "5 Iron", yards: 175 }])?.name).toBe("5 Iron");
  });
});

describe("handicap", () => {
  it("needs 3 rounds", () => {
    const fake = (total: number): PlayedRound => ({
      round: { id: "1", date: "2026-01-01", courseId: "c", scores: { me: [total] }, created: 1 },
      course: { id: "c", name: "X", par: [36] },
      scores: [total],
      par: [36],
      total,
      parTotal: 36,
      holes: 9,
    });
    expect(handicapEstimate([fake(40), fake(42)])).toBeNull();
    expect(handicapEstimate([fake(40), fake(42), fake(38)])).not.toBeNull();
  });
});
