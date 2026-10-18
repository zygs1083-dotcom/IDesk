import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { config } from "../config.ts";
import { deleteAgent, registerAgent } from "../core/agents/agents.ts";
import { createTask, getTask, type Task } from "../core/tasks/store.ts";
import { actOnTask } from "../core/tasks/transition.ts";
import { db } from "../db/client.ts";
import { agents, pluginState } from "../db/schema.ts";
import { app } from "../http/app.ts";
import { startPlugins } from "./host.ts";
import { enablePlugin, stopPlugins } from "./registry.ts";

const originalDataDir = config.IDESK_DATA_DIR;
let directory: string;
let cookie: string;
let agent: ReturnType<typeof registerAgent>;

beforeEach(async () => {
  directory = mkdtempSync(join(tmpdir(), "idesk-result-archive-"));
  config.IDESK_DATA_DIR = directory;
  db.delete(pluginState).run();
  db.update(agents).set({ webhookUrl: null }).run();
  agent = registerAgent({ name: 'Writer: "A"', kind: "codex", host: "test", capabilities: [] });
  await startPlugins();
  const login = await app.request("/api/v1/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ password: "test" }),
  });
  cookie = (login.headers.get("Set-Cookie") as string).split(";")[0] as string;
});
afterEach(async () => {
  await stopPlugins();
  db.delete(pluginState).run();
  config.IDESK_DATA_DIR = originalDataDir;
  rmSync(directory, { recursive: true, force: true });
  vi.useRealTimers();
});

function archivePath(id: string, iso: string): string {
  return join(
    directory,
    "plugin-data/result-archive",
    iso.slice(0, 7),
    `${iso.slice(0, 10)}-${id}.md`,
  );
}

async function post(path: string, body: object) {
  const response = await app.request(`/api/v1/${path}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${agent.apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  expect(response.ok).toBe(true);
  return response.json();
}

test("enabled plugin archives completed tasks with reversible frontmatter", async () => {
  const enabled = await app.request("/api/v1/plugins/result-archive/enable", {
    method: "POST",
    headers: { Cookie: cookie },
  });
  expect(enabled.status).toBe(200);
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-04-01T00:30:00+08:00"));
  const title = 'Review: "quoted" title\nnext line';
  const tags = ["a:b", 'say "hi"'];
  const task = await post("tasks", { title, body: "Task **body**", tags });
  await post(`tasks/${task.id}/actions/claim`, {});
  await post(`tasks/${task.id}/actions/complete`, { result: "Done\nwith details" });
  const iso = ((getTask(task.id) as Task).completedAt as Date).toISOString();
  expect(iso).toBe("2026-03-31T16:30:00.000Z");
  const content = readFileSync(archivePath(task.id, iso), "utf8");
  expect(content).toBe(
    [
      "---",
      `title: ${JSON.stringify(title)}`,
      `assignee: ${JSON.stringify(agent.agent.name)}`,
      `publisher: ${JSON.stringify(agent.agent.name)}`,
      `tags: ${JSON.stringify(tags)}`,
      `completedAt: ${iso}`,
      "---",
      "",
      "Task **body**",
      "",
      "## 结果",
      "",
      "Done",
      "with details",
      "",
    ].join("\n"),
  );
  const values = Object.fromEntries(
    content
      .split("\n")
      .slice(1, 5)
      .map((line) => {
        const separator = line.indexOf(": ");
        return [line.slice(0, separator), JSON.parse(line.slice(separator + 2))];
      }),
  );
  expect(values).toEqual({ title, assignee: agent.agent.name, publisher: agent.agent.name, tags });
});

test("fresh plugin state defaults off and completion creates no archive", async () => {
  const response = await app.request("/api/v1/plugins", { headers: { Cookie: cookie } });
  expect(await response.json()).toContainEqual(
    expect.objectContaining({ id: "result-archive", enabled: false }),
  );
  const task = await post("tasks", { title: "Unarchived" });
  await post(`tasks/${task.id}/actions/claim`, {});
  await post(`tasks/${task.id}/actions/complete`, { result: "done" });
  expect(existsSync(join(directory, "plugin-data/result-archive"))).toBe(false);
});

test("human-published tasks preserve empty sections and overwrite only the same completion date", async () => {
  await enablePlugin("result-archive");
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-01-31T23:00:00Z"));
  const task = createTask({ title: "Human task" }, "human");
  expect(
    actOnTask(task.id, { type: "claim" }, { kind: "agent", id: agent.agent.id, capabilities: [] }),
  ).toMatchObject({ status: "in_progress" });
  actOnTask(task.id, { type: "complete", result: "" }, { kind: "human" });
  const firstPath = archivePath(task.id, "2026-01-31");
  const initial = readFileSync(firstPath, "utf8");
  expect(initial).toContain(`assignee: ${JSON.stringify(agent.agent.name)}\npublisher: "human"`);
  expect(initial).toContain("---\n\n\n\n## 结果\n\n\n");
  actOnTask(task.id, { type: "reopen" }, { kind: "human" });
  expect(
    actOnTask(task.id, { type: "claim" }, { kind: "agent", id: agent.agent.id, capabilities: [] }),
  ).toMatchObject({ status: "in_progress" });
  actOnTask(task.id, { type: "complete", result: "replacement" }, { kind: "human" });
  const replacement = readFileSync(firstPath, "utf8");
  expect(replacement).toContain("## 结果\n\nreplacement\n");
  vi.setSystemTime(new Date("2026-02-01T00:00:00Z"));
  actOnTask(task.id, { type: "reopen" }, { kind: "human" });
  expect(
    actOnTask(task.id, { type: "claim" }, { kind: "agent", id: agent.agent.id, capabilities: [] }),
  ).toMatchObject({ status: "in_progress" });
  actOnTask(task.id, { type: "complete", result: "next month" }, { kind: "human" });
  expect(readFileSync(firstPath, "utf8")).toBe(replacement);
  expect(readFileSync(archivePath(task.id, "2026-02-01"), "utf8")).toContain("next month\n");
});

test("deleted assignee and publisher are archived by id on completion", async () => {
  await enablePlugin("result-archive");
  const task = createTask({ title: "Deleted worker" }, agent.agent.id);
  actOnTask(task.id, { type: "claim" }, { kind: "agent", id: agent.agent.id, capabilities: [] });
  deleteAgent(agent.agent.id);
  expect(actOnTask(task.id, { type: "complete", result: "done" }, { kind: "human" })).toMatchObject(
    { status: "done" },
  );
  const completed = getTask(task.id) as Task;
  const content = readFileSync(
    archivePath(task.id, (completed.completedAt as Date).toISOString()),
    "utf8",
  );
  expect(content).toContain(`assignee: "${agent.agent.id}"\npublisher: "${agent.agent.id}"`);
});
