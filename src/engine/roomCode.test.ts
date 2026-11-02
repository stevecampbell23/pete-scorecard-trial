import { describe, expect, it } from "vitest";
import { codeFromHash, groupUrl, normalizeRoomCode, peerIdFor } from "./roomCode";

describe("room code", () => {
  it("strips junk and builds a stable peer id", () => {
    expect(normalizeRoomCode("ab-c2")).toBe("ABC2");
    expect(peerIdFor("k7q2")).toBe("petetrialK7Q2");
  });

  it("reads a group from the hash", () => {
    expect(codeFromHash("#g=K7Q2")).toBe("K7Q2");
    expect(groupUrl("k7q2", "https://example.test/pete/")).toContain("#g=K7Q2");
  });
});
