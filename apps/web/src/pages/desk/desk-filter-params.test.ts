import { expect, test } from "vitest";
import { deskFilterParams } from "./desk-filter-params.ts";

test.each([
  ["", null, "flat"],
  ["", "host", "host"],
  ["group=flat", "host", "flat"],
  ["group=host", "flat", "host"],
  ["group=unknown", "host", "flat"],
  ["group=", "host", "flat"],
] as const)("group initializes from %s before preference %s", (query, preference, expected) => {
  const filters = deskFilterParams(new URLSearchParams(query), preference);
  expect(filters.group).toBe(expected);
  expect(filters.normalized.get("group")).toBe(expected);
  expect(deskFilterParams(filters.normalized, "flat").group).toBe(expected);
});

test.each(["in_progress", "silent", "blocked", "waiting", "overdue"])(
  "a shared search and %s health filter replay with the task and unknown values intact",
  (health) => {
    const params = new URLSearchParams("q=search+words&task=task-1&extra=a&extra=b");
    params.set("health", health);
    const filters = deskFilterParams(params, "host");
    expect(filters.search).toBe("search words");
    expect(filters.healthFilter).toBe(health);
    expect(filters.normalized.get("task")).toBe("task-1");
    expect(filters.normalized.getAll("extra")).toEqual(["a", "b"]);
    expect(params.has("group")).toBe(false);
  },
);

test.each(["", "unknown", "false"])("invalid health %s means no filter", (health) => {
  const filters = deskFilterParams(new URLSearchParams({ health, q: "" }), "flat");
  expect(filters.healthFilter).toBeNull();
  expect(filters.search).toBe("");
  expect(filters.normalized.has("health")).toBe(false);
  expect(filters.normalized.has("q")).toBe(false);
});

test("normalization uses URLSearchParams first values and retains whitespace searches", () => {
  const params = new URLSearchParams(
    "group=host&group=flat&health=blocked&health=silent&q=+&q=last",
  );
  const filters = deskFilterParams(params, "flat");
  expect(filters.group).toBe("host");
  expect(filters.healthFilter).toBe("blocked");
  expect(filters.search).toBe(" ");
  expect(filters.normalized.getAll("group")).toEqual(["host"]);
  expect(filters.normalized.getAll("health")).toEqual(["blocked", "silent"]);
  expect(filters.normalized.getAll("q")).toEqual([" ", "last"]);
});
