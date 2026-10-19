import { readFileSync } from "node:fs";
import type { OpenAPIHono } from "@hono/zod-openapi";
import {
  createdServerSchema,
  createServerSchema,
  patchServerSchema,
  publicServerSchema,
  serverMetricsQuerySchema,
  serverMetricsSchema,
  serverSampleInputSchema,
} from "@idesk/shared/server-schemas";
import { idSchema } from "@idesk/shared/task-schemas";
import { z } from "zod";
import { config } from "../../config.ts";
import {
  createServer,
  deleteServer,
  listServers,
  recordSample,
  renameServer,
  rotateServerToken,
  serverMetrics,
} from "../../core/servers/servers.ts";
import { HttpError } from "../errors.ts";
import { type AuthEnv, requireHuman } from "../middleware/auth.ts";
import { installScript } from "./server-install.ts";

export function probeRoutes(app: OpenAPIHono<AuthEnv>) {
  app.openapi(
    {
      method: "post",
      path: "/api/probe/v1/samples",
      request: {
        body: {
          required: true,
          content: { "application/json": { schema: serverSampleInputSchema } },
        },
      },
      responses: { 204: { description: "Sample accepted" } },
    },
    (c) => {
      const authorization = c.req.header("Authorization");
      if (
        !authorization?.startsWith("Bearer ids_") ||
        !recordSample(authorization.slice(7), c.req.valid("json"))
      )
        throw new HttpError(401, "server.invalidToken");
      return c.body(null, 204);
    },
  );
  app.get("/api/probe/v1/probe.mjs", (c) =>
    c.body(readFileSync(config.IDESK_PROBE_DIST), 200, {
      "Content-Type": "text/javascript; charset=utf-8",
    }),
  );
  app.get("/api/probe/v1/install.sh", (c) =>
    c.body(installScript(new URL(c.req.url).origin), 200, {
      "Content-Type": "text/x-shellscript; charset=utf-8",
    }),
  );
}

export function serverRoutes(app: OpenAPIHono<AuthEnv>) {
  app.openapi(
    {
      method: "get",
      path: "/api/v1/servers",
      responses: {
        200: {
          description: "Servers",
          content: { "application/json": { schema: z.array(publicServerSchema) } },
        },
      },
    },
    (c) => c.json(listServers(), 200),
  );
  app.openapi(
    {
      method: "post",
      path: "/api/v1/servers",
      middleware: requireHuman,
      request: {
        body: { required: true, content: { "application/json": { schema: createServerSchema } } },
      },
      responses: {
        201: {
          description: "Created",
          content: { "application/json": { schema: createdServerSchema } },
        },
      },
    },
    (c) => {
      c.header("Cache-Control", "no-store");
      return c.json(createServer(c.req.valid("json").name), 201);
    },
  );
  app.openapi(
    {
      method: "patch",
      path: "/api/v1/servers/{id}",
      middleware: requireHuman,
      request: {
        params: idSchema,
        body: { required: true, content: { "application/json": { schema: patchServerSchema } } },
      },
      responses: {
        200: {
          description: "Renamed",
          content: { "application/json": { schema: publicServerSchema } },
        },
      },
    },
    (c) => {
      const server = renameServer(c.req.valid("param").id, c.req.valid("json").name);
      if (!server) throw new HttpError(404, "server.notFound");
      return c.json(server, 200);
    },
  );
  app.openapi(
    {
      method: "post",
      path: "/api/v1/servers/{id}/rotate-token",
      middleware: requireHuman,
      request: { params: idSchema },
      responses: {
        200: {
          description: "Token rotated",
          content: { "application/json": { schema: createdServerSchema } },
        },
      },
    },
    (c) => {
      const result = rotateServerToken(c.req.valid("param").id);
      if (!result) throw new HttpError(404, "server.notFound");
      c.header("Cache-Control", "no-store");
      return c.json(result, 200);
    },
  );
  app.openapi(
    {
      method: "delete",
      path: "/api/v1/servers/{id}",
      middleware: requireHuman,
      request: { params: idSchema },
      responses: { 204: { description: "Deleted" } },
    },
    (c) => {
      if (!deleteServer(c.req.valid("param").id)) throw new HttpError(404, "server.notFound");
      return c.body(null, 204);
    },
  );
  app.openapi(
    {
      method: "get",
      path: "/api/v1/servers/{id}/metrics",
      request: { params: idSchema, query: serverMetricsQuerySchema },
      responses: {
        200: {
          description: "Metrics",
          content: { "application/json": { schema: serverMetricsSchema } },
        },
      },
    },
    (c) => {
      const result = serverMetrics(c.req.valid("param").id, c.req.valid("query").range);
      if (!result) throw new HttpError(404, "server.notFound");
      return c.json(result, 200);
    },
  );
}
