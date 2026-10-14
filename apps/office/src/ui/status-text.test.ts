import { describe, expect, it } from "vitest";
import { statusText } from "./status-text.ts";
import type { Agent, Task } from "./use-office-data.ts";

const agent: Agent = {
  id: "a",
  name: "测试",
  kind: "codex",
  host: "host",
  capabilities: [],
  webhookUrl: null,
  lastSeenAt: null,
  createdAt: "2026-10-15T00:00:00Z",
  status: "online",
};
const task: Task = {
  id: "t",
  title: "检查接口",
  body: "",
  status: "in_progress",
  priority: "normal",
  tags: [],
  blockedBy: [],
  capabilities: [],
  publisherId: "human",
  assigneeId: "a",
  recruit: null,
  leaseExpiresAt: null,
  result: null,
  dueAt: null,
  createdAt: agent.createdAt,
  updatedAt: agent.createdAt,
  completedAt: null,
};
describe("statusText", () => {
  it("prioritizes offline over owned work", () => {
    expect(statusText({ ...agent, status: "offline" }, [task])).toBe("离线");
  });
  it("prioritizes active work and truncates its title", () => {
    expect(
      statusText(agent, [
        { ...task, title: "一二三四五六七八九十一二三" },
        { ...task, status: "paused" },
      ]),
    ).toBe("在做：一二三四五六七八九十一二…");
  });
  it("shows a break before a pending assignment", () => {
    expect(
      statusText(agent, [
        { ...task, status: "paused" },
        { ...task, status: "assigned" },
      ]),
    ).toBe("休息中");
  });
  it("shows a pending assignment", () => {
    expect(statusText(agent, [{ ...task, status: "assigned" }])).toBe("待接受：检查接口");
  });
  it("ignores other agents and completed tasks", () => {
    expect(
      statusText(agent, [
        { ...task, assigneeId: "b" },
        { ...task, status: "done" },
      ]),
    ).toBe("空闲");
  });
  it("includes recruited team members", () => {
    expect(
      statusText(agent, [
        { ...task, assigneeId: null, recruit: { needed: 2, joined: ["a", "b"] } },
      ]),
    ).toBe("在做：检查接口");
  });
});
