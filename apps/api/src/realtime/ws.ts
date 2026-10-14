import { createNodeWebSocket } from "@hono/node-ws";
import type { OpenAPIHono } from "@hono/zod-openapi";
import { getSignedCookie } from "hono/cookie";
import type { WSContext } from "hono/ws";
import { config } from "../config.ts";
import { onEvent } from "../core/events/bus.ts";
import type { AuthEnv } from "../http/middleware/auth.ts";

const connections = new Set<WSContext>();
onEvent("*", (event) => {
  const message = JSON.stringify({
    type: event.type,
    ts: event.ts,
    ...(event.taskId === null ? {} : { taskId: event.taskId }),
    ...(event.agentId === null ? {} : { agentId: event.agentId }),
  });
  for (const connection of connections) connection.send(message);
});
export function registerWebSocket(app: OpenAPIHono<AuthEnv>) {
  const { injectWebSocket, upgradeWebSocket } = createNodeWebSocket({ app });
  app.get(
    "/ws",
    upgradeWebSocket(async (c) => {
      const session = await getSignedCookie(c, config.IDESK_SESSION_SECRET, "idesk_session");
      return {
        onOpen: (_, ws) => {
          if (session !== "admin") ws.close(1008);
          else connections.add(ws);
        },
        onClose: (_, ws) => {
          connections.delete(ws);
        },
      };
    }),
  );

  return injectWebSocket;
}
