import type { eventSchema } from "@idesk/shared/task-schemas";
import { expect, test } from "vitest";
import type { z } from "zod";
import { eventText } from "./event-text";

type Event = z.infer<typeof eventSchema>;
const agentName = (id: string | null) => (id === null ? "人" : `智能体${id}`);
const cases: { type: string; payload: Event["payload"]; text: string }[] = [
  {
    type: "connector.polled",
    payload: { name: "GitHub", changed: 3 },
    text: "同步了 GitHub，3 项变化",
  },
  {
    type: "schedule.fired",
    payload: { name: "每日同步", status: "success" },
    text: "定时任务「每日同步」执行了",
  },
  {
    type: "schedule.fired",
    payload: { name: "每日同步", status: "failed", error: "HTTP 500" },
    text: "定时任务「每日同步」执行失败：HTTP 500",
  },
  {
    type: "webhook.failed",
    payload: { agentId: "receiver", error: "fetch failed" },
    text: "推送给 智能体receiver 失败：fetch failed",
  },
  {
    type: "chat.failed",
    payload: { type: "chat", error: "HTTP 500" },
    text: "聊天通知失败：HTTP 500",
  },
  { type: "archive.events", payload: { count: 12 }, text: "归档了 12 条事件" },
  { type: "agent.updated", payload: { name: "Codex" }, text: "修改了智能体 Codex" },
  { type: "agent.deleted", payload: { name: "Codex" }, text: "删除了智能体 Codex" },
  { type: "task.lease_expired", payload: {}, text: "租约到期，放回了" },
  { type: "connector.polled", payload: { changed: 0 }, text: "同步了连接器，0 项变化" },
  { type: "schedule.fired", payload: { status: "success" }, text: "定时任务执行了" },
  {
    type: "schedule.fired",
    payload: { status: "failed", error: "fetch failed" },
    text: "定时任务执行失败：fetch failed",
  },
  { type: "metrics.fresh", payload: {}, text: "metrics插件：fresh" },
];

test.each(cases)("$type renders $text", ({ type, payload, text }) => {
  expect(
    eventText(
      { id: "event", ts: "2026-10-15T00:00:00Z", type, payload, taskId: null, agentId: null },
      agentName,
      "zh",
    ),
  ).toBe(text);
});

test("expired leases do not attribute the action to a human", () => {
  expect(
    eventText(
      {
        id: "lease",
        ts: "2026-10-15T00:00:00Z",
        type: "task.lease_expired",
        payload: {},
        taskId: "task",
        agentId: null,
      },
      agentName,
      "zh",
    ),
  ).not.toContain("人");
});

test.each([
  ["task.created", {}, "Human published"],
  ["task.claim", {}, "Human claimed"],
  ["task.reported", { message: "Ready" }, "Human reported: Ready"],
  ["task.dependencies", {}, "Human updated dependencies"],
  ["relay.sent", { to: { kind: "broadcast" } }, "Human sent a message to Everyone"],
  ["connector.polled", { name: "GitHub", changed: 3 }, "Synced GitHub, 3 changes"],
  ["connector.polled", { changed: 0 }, "Synced a connector, 0 changes"],
  ["agent.registered", { name: "Codex" }, "Created agent Codex"],
  ["agent.updated", { name: "Codex" }, "Updated agent Codex"],
  ["agent.deleted", { name: "Codex" }, "Deleted agent Codex"],
  ["schedule.fired", { status: "success" }, "Schedule ran"],
  ["schedule.fired", { name: "Daily", status: "success" }, "Schedule “Daily” ran"],
  ["schedule.fired", { status: "failed", error: "HTTP 500" }, "Schedule failed: HTTP 500"],
  [
    "schedule.fired",
    { name: "Daily", status: "failed", error: "HTTP 500" },
    "Schedule “Daily” failed: HTTP 500",
  ],
  ["webhook.failed", { agentId: "Codex", error: "HTTP 500" }, "Webhook to Codex failed: HTTP 500"],
  ["chat.failed", { error: "HTTP 500" }, "Chat notification failed: HTTP 500"],
  ["archive.events", { count: 12 }, "Archived 12 events"],
  ["task.lease_expired", {}, "Lease expired, released"],
  ["metrics.fresh", {}, "metrics plugin: fresh"],
] satisfies [string, Event["payload"], string][])("English %s", (type, payload, expected) => {
  expect(
    eventText(
      { id: "e", ts: "2026-10-15T00:00:00Z", type, payload, taskId: null, agentId: null },
      (id) => id ?? "Human",
      "en",
    ),
  ).toBe(expected);
});

test("schedule starts have localized text", () => {
  const event = {
    id: "started",
    ts: "2026-01-01T00:00:00Z",
    type: "schedule.started",
    taskId: null,
    agentId: null,
    payload: { name: "Daily" },
  };
  expect(eventText(event, () => "", "en")).toBe("Schedule “Daily” started");
  expect(eventText(event, () => "", "zh")).toBe("定时任务「Daily」开始执行");
});
