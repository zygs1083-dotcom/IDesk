import { expect, test } from "vitest";
import { countBlockers } from "./count-blockers.ts";

test("counts only unfinished dependencies found in the current list", () => {
  const tasks = [
    { id: "open", status: "open" },
    { id: "active", status: "in_progress" },
    { id: "done", status: "done" },
    { id: "cancelled", status: "cancelled" },
  ] as const;
  expect(countBlockers(["open", "active", "done", "cancelled", "old"], [...tasks])).toBe(2);
  expect(countBlockers(["done", "cancelled", "old"], [...tasks])).toBe(0);
  expect(countBlockers([], [...tasks])).toBe(0);
});
