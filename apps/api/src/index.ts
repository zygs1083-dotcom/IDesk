import { serve } from "@hono/node-server";
import { config } from "./config.ts";
import { app, injectWebSocket } from "./http/app.ts";
import { startPlugins } from "./plugins/host.ts";
import { startScheduler } from "./scheduler/runner.ts";

import { startSchedules } from "./scheduler/schedules.ts";

await startPlugins();
startScheduler();
startSchedules();

const server = serve({ fetch: app.fetch, port: config.IDESK_PORT }, (info) => {
  console.log(`IDesk API on http://localhost:${info.port}`);
});

injectWebSocket(server);
