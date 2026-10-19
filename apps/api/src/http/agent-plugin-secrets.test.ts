import { once } from "node:events";
import { createServer } from "node:http";
import type { AddressInfo } from "node:net";
import { registeredAgentSchema } from "@idesk/shared/agent-schemas";
import { eq } from "drizzle-orm";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { z } from "zod";
import notifier from "../../../../plugins/webhook-notifier/index.ts";
import { config } from "../config.ts";
import { MASK } from "../core/connectors/connectors.ts";
import { db } from "../db/client.ts";
import { agents, events, pluginState, tasks } from "../db/schema.ts";
import { registerPlugin, stopPlugins } from "../plugins/registry.ts";
import { app } from "./app.ts";

const originalViewer = config.IDESK_VIEWER_PASSWORD;
let admin: string;
let viewer: string;
function request(path: string, method = "GET", body?: object, credential = admin) {
  return app.request(`/api/v1${path}`, {
    method,
    headers: {
      ...(body === undefined ? {} : { "Content-Type": "application/json" }),
      ...(credential?.startsWith("idk_")
        ? { Authorization: `Bearer ${credential}` }
        : { Cookie: credential }),
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
}
async function login(password: string) {
  const response = await request("/auth/login", "POST", { password });
  return (response.headers.get("Set-Cookie") as string).split(";")[0] as string;
}
beforeEach(async () => {
  config.IDESK_VIEWER_PASSWORD = "webhook-viewer";
  admin = await login("test");
  viewer = await login("webhook-viewer");
  db.delete(tasks).run();
  db.delete(events).run();
  db.delete(agents).run();
  db.delete(pluginState).run();
});
afterEach(async () => {
  await stopPlugins();
  config.IDESK_VIEWER_PASSWORD = originalViewer;
  db.delete(tasks).run();
  db.delete(events).run();
  db.delete(agents).run();
  db.delete(pluginState).run();
});
async function register(webhookUrl?: string) {
  const response = await request("/agents", "POST", {
    name: "fixture",
    kind: "codex",
    host: "test",
    capabilities: [],
    ...(webhookUrl ? { webhookUrl } : {}),
  });
  expect(response.status).toBe(201);
  return registeredAgentSchema.parse(await response.json());
}

test("agent webhook is hidden in all public responses and preserved for real delivery", async () => {
  const received: string[] = [];
  const server = createServer((req, res) => {
    received.push(req.url as string);
    res.end();
  });
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  try {
    const url = `http://127.0.0.1:${(server.address() as AddressInfo).port}/fake-secret`;
    const { agent, apiKey } = await register(url);
    expect(agent.webhookUrl).toBe(MASK);
    for (const credential of [admin, viewer, apiKey]) {
      const response = await request("/agents", "GET", undefined, credential);
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data).toMatchObject([{ webhookUrl: MASK }]);
      expect(JSON.stringify(data)).not.toContain(apiKey);
      expect(JSON.stringify(data)).not.toContain(url);
    }
    for (const [path, method] of [
      ["/agents/me", "GET"],
      ["/agents/me/heartbeat", "POST"],
    ] as const) {
      expect(await (await request(path, method, undefined, apiKey)).json()).toMatchObject({
        webhookUrl: MASK,
      });
    }
    const path = `/agents/${agent.id}`;
    expect(
      await (await request(path, "PATCH", { name: "renamed", webhookUrl: MASK })).json(),
    ).toMatchObject({ webhookUrl: MASK, name: "renamed" });
    await registerPlugin(
      notifier,
      new URL("../../../../plugins/webhook-notifier/index.ts", import.meta.url),
    );
    await request("/tasks", "POST", { title: "first delivery" });
    await vi.waitFor(() => expect(received).toEqual(["/fake-secret"]));
    expect(await (await request(path, "PATCH", { webhookUrl: `${url}-new` })).json()).toMatchObject(
      { webhookUrl: MASK },
    );
    await request("/tasks", "POST", { title: "second delivery" });
    await vi.waitFor(() => expect(received).toEqual(["/fake-secret", "/fake-secret-new"]));
    expect(await (await request(path, "PATCH", { webhookUrl: null })).json()).toMatchObject({
      webhookUrl: null,
    });
    expect(db.select().from(agents).where(eq(agents.id, agent.id)).get()?.webhookUrl).toBeNull();
    expect((await request(path, "PATCH", { webhookUrl: MASK })).status).toBe(400);
    expect(
      (
        await request("/agents", "POST", {
          name: "bad",
          kind: "codex",
          host: "test",
          capabilities: [],
          webhookUrl: MASK,
        })
      ).status,
    ).toBe(400);
  } finally {
    await stopPlugins();
    server.close();
    await once(server, "close");
  }
});

test("plugin webhook config is masked for every reader and markers retain actual setup values", async () => {
  const seen: unknown[] = [];
  await registerPlugin(
    {
      id: "secret-fixture",
      name: "Fixture",
      version: "1",
      kind: "notifier",
      enabledByDefault: false,
      configSchema: z.object({ webhookUrl: z.url(), token: z.string(), label: z.string() }),
      setup(ctx) {
        seen.push(ctx.config);
      },
    },
    new URL("file:///secret-fixture.ts"),
  );
  const { apiKey } = await register();
  const input = {
    webhookUrl: "https://example.invalid/fake-secret",
    token: "fake-token",
    label: "visible",
  };
  const masked = { webhookUrl: MASK, token: MASK, label: "visible" };
  expect(
    await (await request("/plugins/secret-fixture", "PATCH", { config: input })).json(),
  ).toMatchObject({ config: masked });
  for (const credential of [admin, viewer, apiKey]) {
    const response = await request("/plugins", "GET", undefined, credential);
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject([{ config: masked }]);
  }
  expect(await (await request("/plugins/secret-fixture/enable", "POST")).json()).toMatchObject({
    config: masked,
  });
  expect(
    await (
      await request("/plugins/secret-fixture", "PATCH", { config: { ...masked, label: "renamed" } })
    ).json(),
  ).toMatchObject({ config: { ...masked, label: "renamed" } });
  expect(seen).toEqual([input, { ...input, label: "renamed" }]);
});
