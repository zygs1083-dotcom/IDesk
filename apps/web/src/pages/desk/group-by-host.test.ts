import { describe, expect, it } from "vitest";
import type { Agent, Task } from "../../lib/types.ts";
import { groupByHost } from "./group-by-host.ts";

const now = "2026-10-15T00:00:00Z";
const task: Task = {
  id: "task",
  title: "Task",
  body: "",
  status: "open",
  priority: "normal",
  tags: [],
  blockedBy: [],
  capabilities: [],
  publisherId: "human",
  assigneeId: null,
  recruit: null,
  leaseExpiresAt: null,
  result: null,
  dueAt: null,
  createdAt: now,
  updatedAt: now,
  completedAt: null,
};
const agent: Agent = {
  id: "mac",
  name: "Codex",
  kind: "codex",
  host: "mac-mini",
  capabilities: [],
  webhookUrl: null,
  client: null,
  lastSeenAt: null,
  createdAt: now,
  status: "offline",
};
const agents = [agent, { ...agent, id: "gpu", host: "gpu-box" }];

describe("groupByHost", () => {
  it("sorts hosts before unassigned tasks and preserves order within each group", () => {
    const tasks = [
      { ...task, id: "human" },
      { ...task, id: "mac-first", publisherId: "mac" },
      { ...task, id: "missing-publisher", publisherId: "deleted" },
      { ...task, id: "assigned-gpu", publisherId: "mac", assigneeId: "gpu" },
      { ...task, id: "mac-second", publisherId: "gpu", assigneeId: "mac" },
      { ...task, id: "human-assigned", assigneeId: "gpu" },
      { ...task, id: "missing-assignee", publisherId: "mac", assigneeId: "deleted" },
    ];
    expect(groupByHost(tasks, agents)).toEqual([
      { host: "gpu-box", tasks: [tasks[3], tasks[5]] },
      { host: "mac-mini", tasks: [tasks[1], tasks[4]] },
      { host: null, tasks: [tasks[0], tasks[2], tasks[6]] },
    ]);
  });

  it("omits empty host groups", () => {
    expect(groupByHost([], agents)).toEqual([]);
    expect(groupByHost([{ ...task, publisherId: "mac" }], agents)).toEqual([
      { host: "mac-mini", tasks: [{ ...task, publisherId: "mac" }] },
    ]);
  });
});
