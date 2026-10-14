import { serve } from "@hono/node-server";
import { config } from "./config.ts";
import { app } from "./http/app.ts";

serve({ fetch: app.fetch, port: config.IDESK_PORT }, (info) => {
  console.log(`IDesk API on http://localhost:${info.port}`);
});
