import { describe, expect, it } from "vitest";
import {
  BOARD_COLUMNS,
  TASK_STATUSES,
  TASK_STATUS_LABELS,
  actionsFor,
  canTransition,
  capabilitiesMatch,
  initialStatus,
  nextStatus,
  resolveHandoff,
  resolveJoin,
} from "./task-status.js";

describe("task state machine", () => {
  it("follows the main line open -> in_progress -> done", () => {
    expect(nextStatus("open", "claim")).toBe("in_progress");
    expect(nextStatus("in_progress", "complete")).toBe("done");
  });

  it("supports assign then start", () => {
    expect(nextStatus("open", "assign")).toBe("assigned");
    expect(nextStatus("assigned", "start")).toBe("in_progress");
  });

  it("handoff is a transfer, not a status", () => {
    expect(nextStatus("in_progress", "handoff")).toBe("open");
    expect(nextStatus("paused", "handoff")).toBe("open");
    expect(resolveHandoff(true)).toBe("assigned");
    expect(resolveHandoff(false)).toBe("open");
    expect(TASK_STATUSES).not.toContain("handoff");
  });

  it("supports pause/resume and release", () => {
    expect(nextStatus("in_progress", "pause")).toBe("paused");
    expect(nextStatus("paused", "resume")).toBe("in_progress");
    expect(nextStatus("paused", "release")).toBe("open");
  });

  it("rejects invalid transitions", () => {
    expect(nextStatus("open", "complete")).toBeNull();
    expect(canTransition("done", "claim")).toBe(false);
    expect(nextStatus("done", "reopen")).toBe("open");
  });

  it("every non-terminal status can be cancelled", () => {
    for (const s of TASK_STATUSES) {
      if (s === "done") continue;
      expect(nextStatus(s, "cancel")).toBe("done");
    }
  });

  it("recruiting fills up with join", () => {
    expect(initialStatus(1)).toBe("open");
    expect(initialStatus(3)).toBe("recruiting");
    expect(resolveJoin(1, 3)).toBe("recruiting");
    expect(resolveJoin(3, 3)).toBe("in_progress");
  });

  it("lists actions and labels for every status", () => {
    for (const s of TASK_STATUSES) {
      expect(actionsFor(s).length).toBeGreaterThan(0);
      expect(TASK_STATUS_LABELS[s]).toBeTruthy();
    }
    expect(BOARD_COLUMNS).toHaveLength(TASK_STATUSES.length);
  });

  it("matches capabilities case-insensitively", () => {
    expect(capabilitiesMatch([], ["x"])).toBe(true);
    expect(capabilitiesMatch(["Coding", "browser"], ["coding", "BROWSER", "gpu"])).toBe(true);
    expect(capabilitiesMatch(["gpu"], ["coding"])).toBe(false);
  });
});
