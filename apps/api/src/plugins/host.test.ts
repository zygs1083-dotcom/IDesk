import { existsSync } from "node:fs";
import { eq } from "drizzle-orm";
import { expect, test, vi } from "vitest";
import { z } from "zod";
import { registerAgent } from "../core/agents/agents.ts";
import { emitEvent } from "../core/events/bus.ts";
import { createTask } from "../core/tasks/store.ts";
import { db } from "../db/client.ts";
import { events, pluginState } from "../db/schema.ts";
import { app } from "../http/app.ts";
import { cookie } from "./host-fixture.ts";
import { disablePlugin, plugins, registerPlugin } from "./registry.ts";
import type { Plugin } from "./types.ts";

const source = new URL("file:///config-fixture.js");
const fixture: Plugin = {
  id: "config-fixture",
  name: "Config fixture",
  version: "1",
  kind: "action",
  configSchema: z.object({ token: z.string().optional(), other: z.number().default(0) }),
};
function patch(id: string, config: Record<string, unknown>) {
  return app.request(`/api/v1/plugins/${id}`, {
    method: "PATCH",
    headers: { Cookie: cookie, "Content-Type": "application/json" },
    body: JSON.stringify({ config }),
  });
}
async function listing() {
  const response = await app.request("/api/v1/plugins", { headers: { Cookie: cookie } });
  return response.json();
}

test("default-disabled plugins honor persisted intent on registration", async () => {
  const setup = vi.fn();
  const plugin = { ...fixture, enabledByDefault: false, setup };
  await registerPlugin(plugin, source);
  expect(setup).not.toHaveBeenCalled();
  expect(await listing()).toContainEqual(
    expect.objectContaining({ id: plugin.id, enabled: false }),
  );
  db.insert(pluginState).values({ pluginId: plugin.id, enabled: true }).run();
  await registerPlugin(plugin, source);
  expect(setup).toHaveBeenCalledOnce();
});

test("configuration applies live, preserves masked secrets and stores raw inputs", async () => {
  const seen: unknown[] = [];
  const teardown = vi.fn();
  await registerPlugin(
    {
      ...fixture,
      setup: (ctx) => {
        seen.push(ctx.config);
      },
      teardown,
    },
    source,
  );
  expect(seen).toEqual([{ other: 0 }]);
  const response = await patch(fixture.id, { token: "abc" });
  expect(response.status).toBe(200);
  expect(await response.json()).toMatchObject({ config: { token: "••••••" } });
  expect(await listing()).toContainEqual(expect.objectContaining({ config: { token: "••••••" } }));
  expect(seen).toEqual([{ other: 0 }, { token: "abc", other: 0 }]);
  await patch(fixture.id, { token: "••••••", other: 1 });
  expect(
    db.select().from(pluginState).where(eq(pluginState.pluginId, fixture.id)).get()?.config,
  ).toEqual({ token: "abc", other: 1 });
  expect(seen.at(-1)).toEqual({ token: "abc", other: 1 });
  expect(teardown).toHaveBeenCalledTimes(2);
  expect((await patch(fixture.id, { other: "bad" })).status).toBe(400);
  expect(seen).toHaveLength(3);
  await disablePlugin(fixture.id);
  expect((await patch(fixture.id, { other: 2 })).status).toBe(200);
  expect(seen).toHaveLength(3);
  expect(
    db.select().from(pluginState).where(eq(pluginState.pluginId, fixture.id)).get(),
  ).toMatchObject({ enabled: false, config: { other: 2 } });
});

test("schema failure becomes plugin state and a corrected config retries setup", async () => {
  const setup = vi.fn();
  await registerPlugin(
    { ...fixture, configSchema: z.object({ required: z.string() }), setup },
    source,
  );
  expect(setup).not.toHaveBeenCalled();
  expect(await listing()).toContainEqual(
    expect.objectContaining({ id: fixture.id, enabled: false, error: expect.any(String) }),
  );
  expect(plugins.get("webhook-notifier")?.enabled).toBe(true);
  expect(
    db.select().from(pluginState).where(eq(pluginState.pluginId, fixture.id)).get(),
  ).toBeUndefined();
  const response = await patch(fixture.id, { required: "fixed" });
  expect(await response.json()).toMatchObject({ enabled: true });
  expect(plugins.get(fixture.id)?.error).toBeUndefined();
  expect(setup).toHaveBeenCalledOnce();
});

test("partial setup failures revoke subscriptions, crons and routes and can be disabled", async () => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-01-01T00:00:00Z"));
  const listener = vi.fn();
  const cron = vi.fn(async () => {});
  await registerPlugin(
    {
      ...fixture,
      setup(ctx) {
        ctx.events.on("fixture.failed", listener);
        ctx.schedule("* * * * * *", cron);
        throw new Error("setup failed");
      },
    },
    source,
  );
  emitEvent({ type: "fixture.failed" });
  await vi.advanceTimersByTimeAsync(1100);
  expect(listener).not.toHaveBeenCalled();
  expect(cron).not.toHaveBeenCalled();
  expect(plugins.get(fixture.id)).toMatchObject({ enabled: false, error: "setup failed" });
  await disablePlugin(fixture.id);
  expect(plugins.get(fixture.id)?.error).toBeUndefined();
  expect(
    db.select().from(pluginState).where(eq(pluginState.pluginId, fixture.id)).get()?.enabled,
  ).toBe(false);
});

test("connector configuration belongs to instances and patch requires a human", async () => {
  let config: unknown = "unset";
  await registerPlugin(
    {
      ...fixture,
      kind: "connector",
      setup(ctx) {
        config = ctx.config;
      },
    },
    source,
  );
  expect(config).toBeUndefined();
  const response = await patch(fixture.id, {});
  expect(response.status).toBe(400);
  expect(await response.json()).toEqual({ error: "连接器的配置在连接器实例上" });
  expect(await listing()).toContainEqual(expect.objectContaining({ id: fixture.id, config: {} }));
  expect((await patch("missing", {})).status).toBe(404);
  const { apiKey } = registerAgent({
    name: "config-agent",
    kind: "codex",
    host: "test",
    capabilities: [],
  });
  expect(
    (
      await app.request(`/api/v1/plugins/${fixture.id}`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ config: {} }),
      })
    ).status,
  ).toBe(403);
});

test("setup receives an existing data directory and can assign tasks as system", async () => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-01-01T00:00:00Z"));
  const { agent } = registerAgent({
    name: "assignee",
    kind: "codex",
    host: "test",
    capabilities: [],
  });
  const task = createTask({ title: "system assign" }, "human");
  await registerPlugin(
    {
      ...fixture,
      setup(ctx) {
        expect(existsSync(ctx.dataDir)).toBe(true);
        expect(ctx.dataDir).toMatch(/plugin-data\/config-fixture$/);
        expect(ctx.tasks.act(task.id, { type: "assign", agentId: agent.id })).toMatchObject({
          status: "assigned",
          assigneeId: agent.id,
        });
      },
    },
    source,
  );
  expect(plugins.get(fixture.id)?.error).toBeUndefined();
  expect(db.select().from(events).where(eq(events.taskId, task.id)).all()).toContainEqual(
    expect.objectContaining({ type: "task.assign", agentId: null }),
  );
});
