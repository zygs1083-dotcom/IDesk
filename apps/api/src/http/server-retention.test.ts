import { eq } from "drizzle-orm";
import { afterEach, expect, test, vi } from "vitest";
import { config } from "../config.ts";
import { createServer, pruneServerSamples, recordSample } from "../core/servers/servers.ts";
import { db } from "../db/client.ts";
import { serverSamples } from "../db/schema.ts";
import { app } from "./app.ts";

afterEach(() => {
  vi.useRealTimers();
  config.IDESK_VIEWER_PASSWORD = undefined;
});

test("viewer cannot modify servers and retention deletes only old samples", async () => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-10-19T12:00:00.000Z"));
  config.IDESK_VIEWER_PASSWORD = "viewer-w104";
  const login = await app.request("/api/v1/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ password: "viewer-w104" }),
  });
  expect(login.status).toBe(200);
  const viewer = (login.headers.get("Set-Cookie") as string).split(";")[0] as string;
  const { server, token } = createServer("W104 retention fixture server");
  for (const [path, method] of [
    ["/api/v1/servers", "POST"],
    [`/api/v1/servers/${server.id}`, "PATCH"],
    [`/api/v1/servers/${server.id}`, "DELETE"],
    [`/api/v1/servers/${server.id}/rotate-token`, "POST"],
  ] as const) {
    const response = await app.request(path, { method, headers: { Cookie: viewer } });
    expect(response.status).toBe(403);
  }
  expect(
    recordSample(token, {
      info: { hostname: "fixture", os: "Linux", kernel: "6.1", cpuModel: "Test", cpuCount: 1 },
      cpu: 10,
      cores: [10],
      load: [1, 2, 3],
      memUsed: 100,
      memTotal: 200,
      swapUsed: 0,
      swapTotal: 0,
      disks: [],
      netRx: 0,
      netTx: 0,
      uptime: 100,
    }),
  ).toBe(true);
  const latest = db
    .select()
    .from(serverSamples)
    .where(eq(serverSamples.serverId, server.id))
    .get() as typeof serverSamples.$inferSelect;
  db.insert(serverSamples)
    .values({ ...latest, id: undefined, ts: new Date("2026-10-12T11:59:59.000Z") })
    .run();
  pruneServerSamples(new Date());
  expect(
    db.select().from(serverSamples).where(eq(serverSamples.serverId, server.id)).all(),
  ).toHaveLength(1);
});
