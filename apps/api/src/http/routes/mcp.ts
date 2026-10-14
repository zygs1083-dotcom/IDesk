import type { OpenAPIHono } from "@hono/zod-openapi";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { createMcpServer } from "../../mcp/server.ts";
import { HttpError } from "../errors.ts";
import { type AuthEnv, bearerAgent } from "../middleware/auth.ts";

export function mcpRoutes(app: OpenAPIHono<AuthEnv>) {
  app.all("/mcp", async (c) => {
    const agent = bearerAgent(c.req.header("Authorization"));
    if (!agent) throw new HttpError(401, "未登录");
    const server = createMcpServer(agent);
    const transport = new WebStandardStreamableHTTPServerTransport({});
    await server.connect(transport);
    return transport.handleRequest(c.req.raw);
  });
}
