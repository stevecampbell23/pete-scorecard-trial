import { describe, expect, it } from "vitest";
import { mergeLive, mergeShared, shareSlice } from "./merge";
import type { AppState, LiveRound } from "../types";

function base(): AppState {
  return {
    players: [{ id: "me", name: "You" }],
    courses: [],
    rounds: [],
    live: null,
    me: "me",
    clubs: [],
  };
}

function live(partial: Partial<LiveRound> & Pick<LiveRound, "id" | "scores">): LiveRound {
  return {
    date: "2026-11-02",
    courseId: "c",
    playerIds: Object.keys(partial.scores),
    hole: 0,
    created: 1,
    ...partial,
  };
}

describe("group merge", () => {
  it("adds a buddy from the other phone and keeps this phone as me", () => {
    const next = mergeShared(base(), {
      players: [
        { id: "me", name: "You" },
        { id: "dale", name: "Dale" },
      ],
      courses: [],
      rounds: [],
      live: null,
    });
    expect(next.me).toBe("me");
    expect(next.players.map((p) => p.name).sort()).toEqual(["Dale", "You"]);
  });

  it("does not copy the other phone's bag", () => {
    const local = { ...base(), clubs: [{ id: "d", name: "Driver", yards: 230 }] };
    const next = mergeShared(local, shareSlice({ ...base(), clubs: [{ id: "x", name: "X", yards: 1 }] }));
    expect(next.clubs).toEqual(local.clubs);
  });

  it("fills empty holes from the other phone on the same live round", () => {
    const a = live({
      id: "r1",
      updated: 10,
      scores: { me: [4, null], dale: [null, null] },
    });
    const b = live({
      id: "r1",
      updated: 11,
      scores: { me: [null, null], dale: [5, null] },
    });
    const m = mergeLive(a, b)!;
    expect(m.scores.me[0]).toBe(4);
    expect(m.scores.dale[0]).toBe(5);
  });
});
