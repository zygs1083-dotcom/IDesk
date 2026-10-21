import type { eventSchema } from "@idesk/shared/task-schemas";
import { expect, test } from "vitest";
import type { z } from "zod";
import { translator } from "../i18n/translate.ts";
import { eventText } from "./event-text.ts";

type Event = z.infer<typeof eventSchema>;
const cases: [string, Event["payload"], string, string][] = [
  ["task.updated", {}, "管理员 更新了任务信息", "Admin updated task details"],
  ["relay.read", {}, "管理员 已读消息", "Admin read a message"],
  [
    "agent.key_rotated",
    { name: "Codex" },
    "已轮换智能体 Codex 的密钥",
    "Rotated key for agent Codex",
  ],
  ["schedule.started", { name: "Daily" }, "定时任务「Daily」开始执行", "Schedule “Daily” started"],
  ["schedule.started", {}, "定时任务开始执行", "Schedule started"],
  [
    "connector.polled",
    { name: "GitHub", changed: 3 },
    "同步了 GitHub，3 项变化",
    "Synced GitHub, 3 changes",
  ],
  ["connector.polled", { changed: 0 }, "同步了连接器，0 项变化", "Synced a connector, 0 changes"],
  [
    "schedule.fired",
    { name: "Daily", status: "success" },
    "定时任务「Daily」执行了",
    "Schedule “Daily” ran",
  ],
  [
    "schedule.fired",
    { name: "Daily", status: "failed", error: "HTTP 500" },
    "定时任务「Daily」执行失败：HTTP 500",
    "Schedule “Daily” failed: HTTP 500",
  ],
  ["schedule.fired", { status: "success" }, "定时任务执行了", "Schedule ran"],
  [
    "schedule.fired",
    { status: "failed", error: "HTTP 500" },
    "定时任务执行失败：HTTP 500",
    "Schedule failed: HTTP 500",
  ],
  [
    "webhook.failed",
    { agentId: "receiver", error: "HTTP 500" },
    "推送给 Codex 失败：HTTP 500",
    "Webhook to Codex failed: HTTP 500",
  ],
  [
    "webhook.failed",
    { agentId: "missing", error: "HTTP 500" },
    "推送给 已删除的智能体 失败：HTTP 500",
    "Webhook to Deleted agent failed: HTTP 500",
  ],
  [
    "chat.failed",
    { type: "chat", error: "HTTP 500" },
    "聊天通知失败：HTTP 500",
    "Chat notification failed: HTTP 500",
  ],
  ["archive.events", { count: 12 }, "归档了 12 条事件", "Archived 12 events"],
  ["agent.registered", { name: "Codex" }, "新建了智能体 Codex", "Created agent Codex"],
  ["agent.updated", { name: "Codex" }, "修改了智能体 Codex", "Updated agent Codex"],
  ["agent.deleted", { name: "Codex" }, "删除了智能体 Codex", "Deleted agent Codex"],
  ["task.lease_expired", {}, "租约到期，放回了", "Lease expired, released"],
  ["metrics.fresh.today", {}, "metrics插件：fresh.today", "metrics plugin: fresh.today"],
  [
    "relay.sent",
    { to: { kind: "agent", id: "receiver" } },
    "管理员 发消息给 Codex",
    "Admin sent a message to Codex",
  ],
  [
    "relay.sent",
    { to: { kind: "capability", value: "review" } },
    "管理员 发消息给 能力 review",
    "Admin sent a message to Capability review",
  ],
  [
    "relay.sent",
    { to: { kind: "broadcast" } },
    "管理员 发消息给 全体",
    "Admin sent a message to Everyone",
  ],
  ["task.created", {}, "管理员 发布了", "Admin published"],
  ["task.reported", { message: "Ready" }, "管理员 汇报：Ready", "Admin reported: Ready"],
  ["task.dependencies", {}, "管理员 修改了依赖", "Admin updated dependencies"],
];

for (const lang of ["zh", "en"] as const) {
  const t = translator(lang);
  const agentName = (id: string | null) => {
    if (id === null || id === "human") return t("common.human");
    return id === "receiver" ? "Codex" : t("common.deletedAgent");
  };
  test.each(cases)(`${lang} %s with %j`, (type, payload, zh, en) => {
    const event = makeEvent(type, payload);
    expect(eventText(event, t, agentName)).toBe({ zh, en }[lang]);
  });
  test.each([
    ["claim", "领取了", "claimed"],
    ["assign", "指定了", "assigned"],
    ["recruit", "招募了", "started recruitment for"],
    ["cancel", "取消了", "cancelled"],
    ["accept", "接受了", "accepted"],
    ["decline", "拒绝了", "declined"],
    ["join", "加入了", "joined"],
    ["cancel_recruit", "取消招募了", "cancelled recruitment for"],
    ["heartbeat", "续租了", "renewed the lease for"],
    ["complete", "完成了", "completed"],
    ["pause", "暂停了", "paused"],
    ["handoff", "交接了", "handed off"],
    ["release", "放回了", "released"],
    ["resume", "恢复了", "resumed"],
    ["reopen", "重开了", "reopened"],
  ])(`${lang} task.%s`, (action, zh, en) => {
    expect(eventText(makeEvent(`task.${action}`, {}), t, agentName)).toBe(
      `${t("common.human")} ${{ zh, en }[lang]}`,
    );
  });
  test(`${lang} expired lease has no actor`, () => {
    expect(eventText(makeEvent("task.lease_expired", {}), t, agentName)).not.toContain(
      t("common.human"),
    );
  });
}

function makeEvent(type: string, payload: Event["payload"]): Event {
  return { id: "event", ts: "2026-10-15T00:00:00Z", type, payload, taskId: null, agentId: null };
}

test.each(["feishu", "dingtalk", "wecom", "web"])(
  "person source is translated in office publications via %s",
  (via) => {
    const names = (id: string | null) => (id === "p_pat" ? "Pat" : "Admin");
    const text = eventText(
      makeEvent("task.created", { personId: "p_pat", via }),
      translator("en"),
      names,
    );
    expect(text).toContain("Pat published");
    expect(text.includes("via")).toBe(via !== "web");
    expect(text).not.toContain("Admin");
  },
);

test("a person cancellation in office uses the person source", () => {
  expect(
    eventText(makeEvent("task.cancel", { personId: "p_pat" }), translator("en"), (id) =>
      id === "p_pat" ? "Pat" : "Admin",
    ),
  ).toBe("Pat cancelled");
});
