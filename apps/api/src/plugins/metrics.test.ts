import { TASK_STATUSES } from "@idesk/shared/task-status";
import { count } from "drizzle-orm";
import { afterEach, beforeEach, expect, test } from "vitest";
import { registerAgent } from "../core/agents/agents.ts";
import { emitEvent } from "../core/events/bus.ts";
import { sendRelay } from "../core/relay/relay.ts";
import { createTask } from "../core/tasks/store.ts";
import { actOnTask } from "../core/tasks/transition.ts";
import { db } from "../db/client.ts";
import { agents, events, pluginState, relayMessages, tasks } from "../db/schema.ts";
import { app } from "../http/app.ts";
import { startPlugins } from "./host.ts";
import { disablePlugin, stopPlugins } from "./registry.ts";

let headers: { Authorization: string };

beforeEach(async () => {
  for (const table of [tasks, agents, events, relayMessages, pluginState]) db.delete(table).run();
  await startPlugins();
  const { apiKey } = registerAgent({
    name: "scraper",
    kind: "codex",
    host: "test",
    capabilities: [],
  });
  headers = { Authorization: `Bearer ${apiKey}` };
});
afterEach(async () => {
  await stopPlugins();
});

function scrape() {
  return app.request("/api/plugins/metrics/prometheus", { headers });
}

test("agent key scrapes current task, agent, event and relay counts", async () => {
  registerAgent({ name: "offline", kind: "codex", host: "test", capabilities: [] });
  createTask({ title: "open one" }, "human");
  createTask({ title: "open two" }, "human");
  const cancelled = createTask({ title: "cancelled" }, "human");
  actOnTask(cancelled.id, { type: "cancel" }, { kind: "human" });
  sendRelay({ to: { kind: "broadcast" }, kind: "note", subject: "one" }, "sender");
  sendRelay({ to: { kind: "broadcast" }, kind: "note", subject: "two" }, "sender");
  const response = await scrape();
  expect(response.status).toBe(200);
  expect(response.headers.get("Content-Type")).toBe("text/plain; version=0.0.4");
  const body = await response.text();
  const lines = body.trimEnd().split("\n");
  expect(lines.filter((line) => line.startsWith("# TYPE"))).toEqual([
    "# TYPE idesk_tasks gauge",
    "# TYPE idesk_agents gauge",
    "# TYPE idesk_events_total counter",
    "# TYPE idesk_relay_messages_total counter",
  ]);
  expect(lines.filter((line) => line.startsWith("idesk_tasks{"))).toEqual(
    TASK_STATUSES.map(
      (status) =>
        `idesk_tasks{status="${status}"} ${status === "open" ? 2 : status === "cancelled" ? 1 : 0}`,
    ),
  );
  expect(lines).toContain('idesk_agents{status="online"} 1');
  expect(lines).toContain('idesk_agents{status="offline"} 1');
  expect(lines).toContain("idesk_relay_messages_total 2");
  const grouped = db
    .select({ type: events.type, total: count() })
    .from(events)
    .groupBy(events.type)
    .orderBy(events.type)
    .all();
  expect(lines.filter((line) => line.startsWith("idesk_events_total{"))).toEqual(
    grouped.map(({ type, total }) => `idesk_events_total{type="${type}"} ${total}`),
  );
  expect(body.endsWith("\n")).toBe(true);
  expect(body.endsWith("\n\n")).toBe(false);
  createTask({ title: "fresh" }, "human");
  emitEvent({ type: "metrics.fresh" });
  const fresh = await (await scrape()).text();
  expect(fresh).toContain('idesk_tasks{status="open"} 3\n');
  expect(fresh).toContain('idesk_events_total{type="metrics.fresh"} 1\n');
});

test("requires credentials and disabled metrics routes return 404", async () => {
  expect((await app.request("/api/plugins/metrics/prometheus")).status).toBe(401);
  await disablePlugin("metrics");
  expect((await scrape()).status).toBe(404);
});

test("event labels escape quotes, backslashes and newlines", async () => {
  emitEvent({ type: 'custom."quoted"\\path\nnext' });
  expect(await (await scrape()).text()).toContain(
    'idesk_events_total{type="custom.\\"quoted\\"\\\\path\\nnext"} 1\n',
  );
});

test("metrics is enabled without persisted plugin state", async () => {
  expect(db.select().from(pluginState).all()).toEqual([]);
  const response = await app.request("/api/v1/plugins", { headers });
  expect(response.status).toBe(200);
  expect(await response.json()).toContainEqual(
    expect.objectContaining({ id: "metrics", enabled: true }),
  );
});
