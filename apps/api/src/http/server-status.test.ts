import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { eq } from "drizzle-orm";
import { afterEach, expect, test, vi } from "vitest";
import { config } from "../config.ts";
import { registerAgent } from "../core/agents/agents.ts";
import { db } from "../db/client.ts";
import { serverSamples } from "../db/schema.ts";
import { app } from "./app.ts";

const sample = {
  info: { hostname: "fixture-host", os: "Linux", kernel: "6.1", cpuModel: "Test CPU", cpuCount: 2 },
  cpu: 30,
  cores: [20, 40],
  load: [1, 2, 3],
  memUsed: 300,
  memTotal: 1000,
  swapUsed: 50,
  swapTotal: 100,
  disks: [{ mount: "/", used: 400, total: 1000 }],
  netRx: 100,
  netTx: 200,
  uptime: 500,
};

afterEach(() => {
  vi.useRealTimers();
});

async function cookie(password = "test") {
  const response = await app.request("/api/v1/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ password }),
  });
  expect(response.status).toBe(200);
  const session = response.headers.get("Set-Cookie");
  if (!session) throw new Error("Missing session cookie");
  return session.split(";")[0] as string;
}

async function create(name: string, session: string) {
  const response = await app.request("/api/v1/servers", {
    method: "POST",
    headers: { Cookie: session, "Content-Type": "application/json" },
    body: JSON.stringify({ name }),
  });
  expect(response.status).toBe(201);
  return response.json() as Promise<{ server: { id: string }; token: string }>;
}

function report(token: string, body = sample) {
  return app.request("/api/probe/v1/samples", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

test("token isolation, status, metrics, rotation and deletion", async () => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-10-19T10:00:00.000Z"));
  const admin = await cookie();
  const { server, token } = await create("W104 unique fixture server", admin);
  expect(token).toMatch(/^ids_[A-Za-z0-9_-]{43}$/);
  const list = await (await app.request("/api/v1/servers", { headers: { Cookie: admin } })).json();
  expect(list.find((row: { id: string }) => row.id === server.id)).toMatchObject({
    status: "offline",
    info: null,
  });
  expect(JSON.stringify(list)).not.toContain(token);
  expect(
    (await app.request("/api/v1/tasks", { headers: { Authorization: `Bearer ${token}` } })).status,
  ).toBe(401);
  expect((await report("ids_invalid")).status).toBe(401);
  const agent = registerAgent({
    name: "W104 probe agent fixture",
    kind: "codex",
    host: "fixture",
    capabilities: [],
  });
  expect((await report(agent.apiKey)).status).toBe(401);
  expect((await report(token)).status).toBe(204);
  const updated = await (
    await app.request("/api/v1/servers", { headers: { Cookie: admin } })
  ).json();
  expect(updated.find((row: { id: string }) => row.id === server.id)).toMatchObject({
    status: "online",
    lastSeenAt: "2026-10-19T10:00:00.000Z",
    info: sample.info,
  });
  vi.setSystemTime(new Date("2026-10-19T10:00:10.000Z"));
  expect(
    (await report(token, { ...sample, cpu: 50, disks: [{ mount: "/", used: 600, total: 1000 }] }))
      .status,
  ).toBe(204);
  for (const [range, step] of [
    ["1h", 10],
    ["6h", 60],
    ["24h", 240],
    ["7d", 1680],
  ] as const) {
    const response = await app.request(`/api/v1/servers/${server.id}/metrics?range=${range}`, {
      headers: { Cookie: admin },
    });
    expect(response.status).toBe(200);
    const metrics = await response.json();
    expect(metrics.step).toBe(step);
    expect(metrics.latest).toMatchObject({ cpu: 50, cores: [20, 40], disks: [{ used: 600 }] });
    expect(metrics.points.length).toBeLessThanOrEqual(2);
  }
  const metrics = await (
    await app.request(`/api/v1/servers/${server.id}/metrics?range=6h`, {
      headers: { Cookie: admin },
    })
  ).json();
  expect(metrics.points).toHaveLength(1);
  expect(metrics.points[0]).toMatchObject({ cpu: 40, diskUsed: 500 });
  vi.setSystemTime(new Date("2026-10-19T10:00:40.000Z"));
  const boundary = await (
    await app.request("/api/v1/servers", { headers: { Cookie: admin } })
  ).json();
  expect(boundary.find((row: { id: string }) => row.id === server.id).status).toBe("online");
  vi.setSystemTime(new Date("2026-10-19T10:00:41.000Z"));
  const offline = await (
    await app.request("/api/v1/servers", { headers: { Cookie: admin } })
  ).json();
  expect(offline.find((row: { id: string }) => row.id === server.id).status).toBe("offline");
  vi.setSystemTime(new Date("2026-10-19T10:02:00.000Z"));
  expect((await report(token)).status).toBe(204);
  const sparse = await (
    await app.request(`/api/v1/servers/${server.id}/metrics?range=6h`, {
      headers: { Cookie: admin },
    })
  ).json();
  expect(sparse.points.map((point: { ts: string }) => point.ts)).toEqual([
    "2026-10-19T10:00:00.000Z",
    "2026-10-19T10:02:00.000Z",
  ]);
  const rotated = await app.request(`/api/v1/servers/${server.id}/rotate-token`, {
    method: "POST",
    headers: { Cookie: admin },
  });
  expect(rotated.status).toBe(200);
  const newToken = (await rotated.json()).token as string;
  expect((await report(token)).status).toBe(401);
  expect((await report(newToken)).status).toBe(204);
  expect(
    (
      await app.request(`/api/v1/servers/${server.id}`, {
        method: "DELETE",
        headers: { Cookie: admin },
      })
    ).status,
  ).toBe(204);
  expect(
    db.select().from(serverSamples).where(eq(serverSamples.serverId, server.id)).all(),
  ).toHaveLength(0);
});

test("probe download and installer require no session", async () => {
  const original = config.IDESK_PROBE_DIST;
  const directory = mkdtempSync(join(tmpdir(), "idesk-probe-test-"));
  const path = join(directory, "probe.mjs");
  writeFileSync(path, "export const probe = true;\n");
  config.IDESK_PROBE_DIST = path;
  try {
    const probe = await app.request("http://fixture.example:3300/api/probe/v1/probe.mjs");
    expect(probe.status).toBe(200);
    expect(probe.headers.get("Content-Type")).toContain("text/javascript");
    expect(await probe.text()).toBe("export const probe = true;\n");
    const installer = await app.request("http://fixture.example:3300/api/probe/v1/install.sh");
    expect(installer.status).toBe(200);
    expect(installer.headers.get("Content-Type")).toContain("text/x-shellscript");
    const script = await installer.text();
    expect(script).toContain("http://fixture.example:3300");
    expect(script).not.toMatch(/ids_[A-Za-z0-9_-]{43}/);
  } finally {
    config.IDESK_PROBE_DIST = original;
    rmSync(directory, { recursive: true });
  }
});
