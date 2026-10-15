import { describe, expect, it } from "vitest";
import { averageDurationMs } from "./stats.ts";

function event(type: string, ts: number, taskId = "task") {
  return { type: `task.${type}`, ts: new Date(ts), taskId };
}

describe("averageDurationMs", () => {
  it("averages two claim and complete rounds", () => {
    expect(
      averageDurationMs([
        event("claim", 0, "first"),
        event("complete", 600_000, "first"),
        event("claim", 1_000_000, "second"),
        event("complete", 2_800_000, "second"),
      ]),
    ).toBe(1_200_000);
  });
  it.each(["accept", "join"])("pairs %s starts", (type) => {
    expect(averageDurationMs([event(type, 0), event("complete", 42)])).toBe(42);
  });
  it("uses the latest claim after a release", () => {
    expect(
      averageDurationMs([
        event("claim", 0),
        event("release", 20),
        event("claim", 40),
        event("complete", 100),
      ]),
    ).toBe(60);
  });
  it("ignores unmatched completes and rounds the matched average", () => {
    expect(
      averageDurationMs([
        event("complete", 1, "unmatched"),
        event("claim", 10, "first"),
        event("complete", 11, "first"),
        event("join", 10, "second"),
        event("complete", 12, "second"),
      ]),
    ).toBe(2);
  });
  it("requires a strictly earlier start even when another start shares the completion time", () => {
    expect(averageDurationMs([event("claim", 0), event("join", 10), event("complete", 10)])).toBe(
      10,
    );
    expect(averageDurationMs([event("claim", 10), event("complete", 10)])).toBeNull();
  });
  it("returns null when no completes can be paired", () => {
    expect(averageDurationMs([event("complete", 1), event("claim", 2)])).toBeNull();
    expect(averageDurationMs([])).toBeNull();
  });
});
