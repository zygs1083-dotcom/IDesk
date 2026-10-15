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
    ),
  ).not.toContain("人");
});
