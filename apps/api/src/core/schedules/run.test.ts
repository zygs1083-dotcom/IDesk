import { once } from "node:events";
import { createServer } from "node:http";
import type { AddressInfo } from "node:net";
import { eq } from "drizzle-orm";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { afterEach, beforeEach, expect, test } from "vitest";
import { z } from "zod";
import { db } from "../../db/client.ts";
import { connectors, events, pluginState, schedules, tasks } from "../../db/schema.ts";
import { disablePlugin, registerPlugin, stopPlugins } from "../../plugins/registry.ts";
import type { ConnectorPlugin } from "../../plugins/types.ts";
import { runSchedule } from "./run.ts";
import { createSchedule, type Schedule } from "./schedules.ts";

migrate(db, { migrationsFolder: new URL("../../../drizzle", import.meta.url).pathname });
beforeEach(() => {
  db.delete(schedules).run();
  db.delete(tasks).run();
  db.delete(events).run();
  db.delete(connectors).run();
  db.delete(pluginState).run();
});
afterEach(async () => {
  await stopPlugins();
});
function schedule(action: Schedule["action"], enabled = true) {
  return createSchedule({
    name: "Fixture",
    cron: "* * * * *",
    timezone: "Asia/Shanghai",
    enabled,
    action,
  });
}
function fired(id: string) {
  const recorded = db.select().from(events).where(eq(events.type, "schedule.fired")).all();
  return recorded.find((event) => event.payload.scheduleId === id)?.payload;
}

test("publish_task creates a human task and records execution and the next run", async () => {
  const row = schedule({
    type: "publish_task",
    template: { title: "Scheduled task", tags: ["cron"] },
  });
  const updated = await runSchedule(row.id);
  expect(db.select().from(tasks).all()).toMatchObject([
    { title: "Scheduled task", publisherId: "human", status: "open", tags: ["cron"] },
  ]);
  expect(updated?.lastStatus).toBe("success");
  expect(updated?.lastRunAt).toBeInstanceOf(Date);
  expect(updated?.nextRunAt?.getTime()).toBeGreaterThan(Date.now());
  expect(fired(row.id)).toEqual({ scheduleId: row.id, status: "success" });
});

test("http forwards method, headers and body and records HTTP and network failures", async () => {
  let received:
    | { method: string | undefined; token: string | string[] | undefined; body: string }
    | undefined;
  let status = 200;
  const server = createServer(async (request, response) => {
    let body = "";
    for await (const chunk of request) body += chunk;
    received = { method: request.method, token: request.headers["x-test"], body };
    response.writeHead(status).end();
  });
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const url = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  const row = schedule({
    type: "http",
    url,
    method: "POST",
    headers: { "X-Test": "value" },
    body: "payload",
  });
  try {
    expect((await runSchedule(row.id))?.lastStatus).toBe("success");
    expect(received).toEqual({ method: "POST", token: "value", body: "payload" });
    status = 500;
    expect((await runSchedule(row.id))?.lastStatus).toBe("failed");
    expect(fired(row.id)).toMatchObject({ status: "success" });
    expect(db.select().from(events).all().at(-1)?.payload).toEqual({
      scheduleId: row.id,
      status: "failed",
      error: "HTTP 500",
    });
  } finally {
    server.close();
    await once(server, "close");
  }
  expect((await runSchedule(row.id))?.lastStatus).toBe("failed");
  expect(db.select().from(events).all().at(-1)?.payload.error).toEqual(expect.any(String));
  expect(db.select().from(events).all().at(-1)?.payload.error).not.toBe("");
});

const plugin: ConnectorPlugin = {
  id: "schedule-fixture",
  name: "Schedule fixture",
  version: "1",
  kind: "connector",
  configSchema: z.object({ token: z.string() }),
  async testConnection() {
    return { success: true };
  },
  async listJobs() {
    return [];
  },
  async listRuns() {
    return [];
  },
};
test("connector triggers require an available trigger and pass parsed config, job and params", async () => {
  await registerPlugin(plugin, new URL("file:///schedule-fixture.js"));
  const connector = db
    .insert(connectors)
    .values({ pluginId: plugin.id, name: "Fixture", config: { token: "secret" } })
    .returning()
    .get();
  const row = schedule({
    type: "connector_trigger",
    connectorId: connector.id,
    jobExternalId: "job",
    params: { input: "value" },
  });
  expect((await runSchedule(row.id))?.lastStatus).toBe("failed");
  expect(fired(row.id)).toMatchObject({ error: "该连接器不支持触发" });
  const calls: { config: unknown; job: string; params: unknown }[] = [];
  await registerPlugin(
    {
      ...plugin,
      async trigger(config, job, params) {
        calls.push({ config, job, params });
        return {};
      },
    } as ConnectorPlugin,
    new URL("file:///schedule-fixture.js"),
  );
  expect((await runSchedule(row.id))?.lastStatus).toBe("success");
  expect(calls).toEqual([{ config: { token: "secret" }, job: "job", params: { input: "value" } }]);
  await disablePlugin(plugin.id);
  expect((await runSchedule(row.id))?.lastStatus).toBe("failed");
  expect(db.select().from(events).all().at(-1)?.payload.error).toBe("连接器不可用");
});

test("connector trigger exceptions become failed executions", async () => {
  await registerPlugin(
    {
      ...plugin,
      async trigger() {
        throw new Error("trigger failed");
      },
    } as ConnectorPlugin,
    new URL("file:///schedule-fixture.js"),
  );
  const connector = db
    .insert(connectors)
    .values({ pluginId: plugin.id, name: "Fixture", config: { token: "secret" } })
    .returning()
    .get();
  const row = schedule({
    type: "connector_trigger",
    connectorId: connector.id,
    jobExternalId: "job",
  });
  expect((await runSchedule(row.id))?.lastStatus).toBe("failed");
  expect(fired(row.id)).toMatchObject({ error: "trigger failed" });
});

test("unavailable connectors fail and disabled schedules can run manually without a next run", async () => {
  const missing = schedule({
    type: "connector_trigger",
    connectorId: "missing",
    jobExternalId: "job",
  });
  expect((await runSchedule(missing.id))?.lastStatus).toBe("failed");
  expect(fired(missing.id)).toMatchObject({ error: "连接器不可用" });
  const disabled = schedule({ type: "publish_task", template: { title: "Manual" } }, false);
  expect(await runSchedule(disabled.id)).toMatchObject({ lastStatus: "success", nextRunAt: null });
  expect(await runSchedule("missing")).toBeUndefined();
});
