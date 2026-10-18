import { afterEach, beforeEach, expect, test } from "vitest";
import plugin from "../../../../plugins/dolphinscheduler/index.ts";
import { createConnector } from "../core/connectors/connectors.ts";
import { db } from "../db/client.ts";
import { connectors, pluginState } from "../db/schema.ts";
import { registerPlugin, stopPlugins } from "../plugins/registry.ts";
import { app } from "./app.ts";

let cookie: string;
beforeEach(async () => {
  db.delete(connectors).run();
  db.delete(pluginState).run();
  await registerPlugin(
    plugin,
    new URL("../../../../plugins/dolphinscheduler/index.ts", import.meta.url),
  );
  const login = await app.request("/api/v1/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ password: "test" }),
  });
  cookie = (login.headers.get("Set-Cookie") as string).split(";")[0] as string;
});
afterEach(async () => {
  await stopPlugins();
  db.delete(connectors).run();
  db.delete(pluginState).run();
});

test("invalid DolphinScheduler timezone returns 400 on create, update and connection test", async () => {
  const config = { baseUrl: "http://ds", token: "secret" };
  const connector = createConnector({ pluginId: plugin.id, name: "DS", config });
  for (const [path, method] of [
    ["/connectors", "POST"],
    [`/connectors/${connector.id}`, "PATCH"],
    ["/connectors/test", "POST"],
  ] as const) {
    const response = await app.request(`/api/v1${path}`, {
      method,
      headers: { Cookie: cookie, "Content-Type": "application/json" },
      body: JSON.stringify({
        pluginId: plugin.id,
        name: "DS",
        config: { ...config, timezone: "Not/A_Zone" },
      }),
    });
    expect(response.status).toBe(400);
  }
});
