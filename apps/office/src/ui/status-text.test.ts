import { describe, expect, it } from "vitest";
import { translator } from "../i18n/translate.ts";
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
const zh = translator("zh");
const en = translator("en");
describe("statusText", () => {
  it("prioritizes offline over owned work", () => {
    expect(statusText({ ...agent, status: "offline" }, [task], zh)).toBe("离线");
  });
  it("prioritizes active work and truncates its title", () => {
    expect(
      statusText(
        agent,
        [
          { ...task, title: "一二三四五六七八九十一二三" },
          { ...task, status: "paused" },
        ],
        zh,
      ),
    ).toBe("在做：一二三四五六七八九十一二…");
  });
  it("shows a break before a pending assignment", () => {
    expect(
      statusText(
        agent,
        [
          { ...task, status: "paused" },
          { ...task, status: "assigned" },
        ],
        zh,
      ),
    ).toBe("休息中");
  });
  it("shows a pending assignment", () => {
    expect(statusText(agent, [{ ...task, status: "assigned" }], zh)).toBe("待接受：检查接口");
  });
  it("ignores other agents and completed tasks", () => {
    expect(
      statusText(
        agent,
        [
          { ...task, assigneeId: "b" },
          { ...task, status: "done" },
        ],
        zh,
      ),
    ).toBe("空闲");
  });
  it("includes recruited team members", () => {
    expect(
      statusText(
        agent,
        [{ ...task, assigneeId: null, recruit: { needed: 2, joined: ["a", "b"] } }],
        zh,
      ),
    ).toBe("在做：检查接口");
  });
  it("renders English statuses with the supplied translator", () => {
    expect(statusText({ ...agent, status: "offline" }, [task], en)).toBe("Offline");
    expect(statusText(agent, [task], en)).toBe("Working on: 检查接口");
    expect(statusText(agent, [{ ...task, status: "paused" }], en)).toBe("On a break");
    expect(statusText(agent, [{ ...task, status: "assigned" }], en)).toBe("To accept: 检查接口");
    expect(statusText(agent, [], en)).toBe("Idle");
    expect(
      statusText(agent, [{ ...task, assigneeId: null, recruit: { needed: 2, joined: ["a"] } }], en),
    ).toBe("Working on: 检查接口");
    expect(statusText(agent, [{ ...task, title: "abcdefghijklmnop" }], en)).toBe(
      "Working on: abcdefghijkl…",
    );
  });
});
