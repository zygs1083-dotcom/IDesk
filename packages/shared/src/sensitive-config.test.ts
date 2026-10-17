import { expect, test } from "vitest";
import { patchAgentSchema, registerAgentSchema } from "./agent-schemas.ts";
import { createScheduleSchema, patchScheduleSchema, scheduleSchema } from "./schedule-schemas.ts";

const mask = "••••••";
const http = {
  type: "http",
  method: "POST",
  url: mask,
  headers: { Authorization: mask },
  body: mask,
};
test("masked schedule responses round-trip as PATCH input without weakening creation", () => {
  const publicRow = scheduleSchema.parse({
    id: "test",
    name: "test",
    cron: "* * * * *",
    timezone: "UTC",
    enabled: false,
    action: http,
    lastRunAt: null,
    lastStatus: null,
    nextRunAt: null,
  });
  expect(patchScheduleSchema.parse({ action: publicRow.action }).action).toEqual(http);
  expect(createScheduleSchema.safeParse(publicRow).success).toBe(false);
  expect(
    createScheduleSchema.safeParse({ ...publicRow, action: { ...http, url: "not-a-url" } }).success,
  ).toBe(false);
});

test("agent markers are accepted only by the update contract", () => {
  expect(patchAgentSchema.parse({ webhookUrl: mask })).toEqual({ webhookUrl: mask });
  expect(patchAgentSchema.parse({ webhookUrl: null })).toEqual({ webhookUrl: null });
  expect(
    registerAgentSchema.safeParse({
      name: "test",
      kind: "codex",
      host: "test",
      capabilities: [],
      webhookUrl: mask,
    }).success,
  ).toBe(false);
});
