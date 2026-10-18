import { afterEach, beforeEach, vi } from "vitest";
import { db } from "../db/client.ts";
import { agents, pluginState } from "../db/schema.ts";
import { app } from "../http/app.ts";
import { startPlugins } from "./host.ts";
import { stopPlugins } from "./registry.ts";

export let cookie: string;
beforeEach(async () => {
  db.delete(pluginState).run();
  db.update(agents).set({ webhookUrl: null }).run();
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
  db.update(agents).set({ webhookUrl: null }).run();
  vi.useRealTimers();
});
