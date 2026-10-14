import { Hono } from "hono";
import { logger } from "hono/logger";
import { HTTPException } from "hono/http-exception";
import { ZodError } from "zod";
import type { AppEnv } from "./auth/actor.js";
import { authenticate } from "./auth/middleware.js";
import { authRoutes } from "./auth/routes.js";
import { agentRoutes } from "./agents/routes.js";
import { taskRoutes } from "./tasks/routes.js";
import { relayRoutes } from "./relay/routes.js";
import { eventRoutes } from "./events/routes.js";
import { TASK_STATUSES, TASK_STATUS_LABELS, TASK_ACTIONS, AGENT_KINDS } from "@idesk/core";
import type { PluginHost } from "./plugins/host.js";

export function createApp(opts: { pluginHost?: PluginHost; quiet?: boolean } = {}) {
  const app = new Hono<AppEnv>();
  if (!opts.quiet) app.use(logger());
  app.use(authenticate);

  app.onError((err, c) => {
    if (err instanceof HTTPException) return c.json({ error: err.message }, err.status);
    if (err instanceof ZodError) return c.json({ error: "Validation failed", issues: err.issues }, 400);
    console.error(err);
    return c.json({ error: "Internal error" }, 500);
  });

  const api = new Hono<AppEnv>()
    .get("/health", (c) => c.json({ ok: true, ts: Date.now() }))
    .get("/meta", (c) =>
      c.json({
        name: "IDesk",
        version: "0.1.0",
        taskStatuses: TASK_STATUSES,
        taskStatusLabels: TASK_STATUS_LABELS,
        taskActions: TASK_ACTIONS,
        agentKinds: AGENT_KINDS,
        plugins: opts.pluginHost?.list().map((p) => ({ id: p.id, name: p.name, kind: p.kind })) ?? [],
      }),
    )
    .route("/auth", authRoutes)
    .route("/agents", agentRoutes)
    .route("/tasks", taskRoutes)
    .route("/relay", relayRoutes)
    .route("/events", eventRoutes);

  app.route("/api", api);
  return app;
}

export type App = ReturnType<typeof createApp>;
