import { expect, test } from "vitest";
import { taskQuerySchema, updateTaskSchema } from "./task-schemas.ts";

test("task edit requires supported fields, normalizes capabilities and clears deadlines", () => {
  expect(
    updateTaskSchema.parse({
      title: " corrected ",
      capabilities: ["Coding", "coding"],
      dueAt: null,
    }),
  ).toEqual({ title: "corrected", capabilities: ["coding"], dueAt: null });
  for (const input of [
    {},
    { status: "done" },
    { title: " " },
    { dueAt: "later" },
    { capabilities: ["bad,capability"] },
  ]) {
    expect(updateTaskSchema.safeParse(input).success).toBe(false);
  }
  expect(updateTaskSchema.parse({ body: "", tags: [], capabilities: [] })).toEqual({
    body: "",
    tags: [],
    capabilities: [],
  });
});

test("history pagination validates cursor and limit together with explicit status", () => {
  expect(
    taskQuerySchema.parse({ status: "done", limit: "30", cursor: "1234567890000|id" }),
  ).toMatchObject({ limit: 30 });
  for (const input of [
    { limit: "30" },
    { status: "done", cursor: "123|id" },
    { status: "done", limit: "1", cursor: "bad" },
  ]) {
    expect(taskQuerySchema.safeParse(input).success).toBe(false);
  }
  expect(taskQuerySchema.parse({ q: "text" })).toEqual({ q: "text" });
});
