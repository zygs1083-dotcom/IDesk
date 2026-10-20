import { expect, test } from "vitest";
import {
  assistantDraftSchema,
  assistantHistorySchema,
  assistantReplySchema,
} from "./assistant-schemas.ts";
import { createPersonSchema, patchPersonSchema } from "./people-schemas.ts";

test("person inputs trim names and reject empty, long, invalid role and empty patches", () => {
  expect(createPersonSchema.parse({ name: " 张三 ", role: "member" })).toEqual({
    name: "张三",
    role: "member",
  });
  for (const name of [" ", "a".repeat(21)])
    expect(createPersonSchema.safeParse({ name, role: "member" }).success).toBe(false);
  expect(createPersonSchema.safeParse({ name: "张三", role: "admin" }).success).toBe(false);
  expect(patchPersonSchema.safeParse({}).success).toBe(false);
});
test("assistant history stores only twenty user/assistant text entries", () => {
  expect(assistantHistorySchema.safeParse([{ role: "tool", content: "raw" }]).success).toBe(false);
  expect(
    assistantHistorySchema.safeParse(
      Array.from({ length: 21 }, () => ({ role: "user", content: "hi" })),
    ).success,
  ).toBe(false);
});
test("assistant drafts express confirmed task publication or pending cancellation", () => {
  for (const draft of [
    {
      kind: "task",
      task: { title: "task", priority: "high", dispatch: { type: "recruit", needed: 2 } },
    },
    { kind: "cancel", taskId: "task" },
  ])
    expect(assistantDraftSchema.parse(draft)).toEqual(draft);
  expect(
    assistantReplySchema.parse({ text: "Confirm", options: [{ id: "publish", label: "发布" }] }),
  ).toEqual({ text: "Confirm", options: [{ id: "publish", label: "发布" }] });
});
