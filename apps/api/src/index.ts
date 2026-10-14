import { serve } from "@hono/node-server";
import { config } from "./config.ts";
import { app, injectWebSocket } from "./http/app.ts";

const server = serve({ fetch: app.fetch, port: config.IDESK_PORT }, (info) => {
  console.log(`IDesk API on http://localhost:${info.port}`);
});

injectWebSocket(server);
