import { registeredAgentSchema } from "@idesk/shared/agent-schemas";
import {
  automationJobSchema,
  automationRunSchema,
  automationRunWithJobSchema,
  connectorSchema,
  pollResultSchema,
} from "@idesk/shared/automation-schemas";
import { eq } from "drizzle-orm";
import { afterEach, beforeEach, expect, test } from "vitest";
import { z } from "zod";
import { db } from "../db/client.ts";
import { automationJobs, automationRuns, connectors, pluginState } from "../db/schema.ts";
import { disablePlugin, registerPlugin, stopPlugins } from "../plugins/registry.ts";
import type { ConnectorPlugin } from "../plugins/types.ts";
import { app } from "./app.ts";

let calls = 0;
let cookie: string;
const config = { url: "https://example.com", apiKey: "valid", label: "raw input" };
const input = { pluginId: "rest-fixture", name: "Fixture", config };
const plugin: ConnectorPlugin = {
  id: "rest-fixture",
  name: "REST fixture",
  version: "1",
  kind: "connector",
  configSchema: z.object({ url: z.url(), apiKey: z.string() }),
  async testConnection(input) {
    return (input as typeof config).apiKey === "valid"
      ? { success: true }
      : { success: false, error: "错误密钥" };
  },
  async listJobs() {
    return ["Z", "A"].map((name) => ({
      externalId: name,
      name,
      group: null,
      schedule: null,
      enabled: true,
      url: null,
    }));
  },
  async listRuns() {
    calls++;
    return [1, 2].map((n) => ({
      jobExternalId: "A",
      externalId: String(n),
      status: "success" as const,
      startedAt: new Date(`2026-10-14T12:00:0${n}Z`),
      finishedAt: null,
      trigger: "manual",
      url: null,
      error: null,
    }));
  },
};
function request(path: string, method = "GET", body?: object, credential = cookie) {
  return app.request(`/api/v1${path}`, {
    method,
    headers: {
      ...(credential.startsWith("idk_")
        ? { Authorization: `Bearer ${credential}` }
        : { Cookie: credential }),
      "Content-Type": "application/json",
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
}
async function create() {
  const response = await request("/connectors", "POST", input);
  expect(response.status).toBe(201);
  return connectorSchema.parse(await response.json());
}
function stored(id: string) {
  return db.select().from(connectors).where(eq(connectors.id, id)).get();
}
beforeEach(async () => {
  db.delete(connectors).run();
  db.delete(pluginState).run();
  calls = 0;
  await registerPlugin(plugin, new URL("file:///rest-fixture.js"));
  const login = await request("/auth/login", "POST", { password: "test" }, "");
  cookie = (login.headers.get("Set-Cookie") as string).split(";")[0] as string;
});
afterEach(async () => {
  await stopPlugins();
  db.delete(connectors).run();
  db.delete(pluginState).run();
});
test("creation stores raw config and immediately mirrors jobs and runs", async () => {
  const connector = await create();
  expect(connector.config).toEqual({ ...config, apiKey: "••••••" });
  expect(connector.canTrigger).toBe(false);
  expect(stored(connector.id)?.config).toEqual(config);
  const jobs = z
    .array(automationJobSchema)
    .parse(await (await request(`/automation/jobs?connectorId=${connector.id}`)).json());
  expect(jobs.map((job) => job.name)).toEqual(["A", "Z"]);
  const runs = z
    .array(automationRunSchema)
    .parse(await (await request(`/automation/jobs/${jobs[0]?.id}/runs`)).json());
  expect(runs.map((run) => run.externalId)).toEqual(["2", "1"]);
  expect(await (await request("/automation/jobs?connectorId=missing")).json()).toEqual([]);
});
test("missing and disabled plugins and invalid config are rejected in Chinese", async () => {
  const missing = await request("/connectors", "POST", { ...input, pluginId: "missing" });
  expect(missing.status).toBe(400);
  const invalidConfig = { ...config, url: "bad" };
  const invalid = await request("/connectors", "POST", { ...input, config: invalidConfig });
  expect(invalid.status).toBe(400);
  expect(await invalid.json()).toMatchObject({ error: expect.stringMatching(/[\u4e00-\u9fff]/) });
  await disablePlugin(plugin.id);
  expect((await request("/connectors", "POST", input)).status).toBe(400);
});
test("patch retains masked secrets and accepts replacement secrets", async () => {
  const { id } = await create();
  expect((await request(`/connectors/${id}`, "PATCH", { name: "Renamed" })).status).toBe(200);
  expect(stored(id)).toMatchObject({ name: "Renamed", config });
  for (const apiKey of ["••••••", "new"]) {
    const response = await request(`/connectors/${id}`, "PATCH", { config: { ...config, apiKey } });
    expect(response.status).toBe(200);
    expect(stored(id)?.config.apiKey).toBe(apiKey === "••••••" ? "valid" : apiKey);
  }
});
test("connection tests resolve masked secrets without writing the database", async () => {
  const { id } = await create();
  const before = stored(id);
  const masked = { id, pluginId: plugin.id, config: { ...config, apiKey: "••••••" } };
  const success = await request("/connectors/test", "POST", masked);
  expect(await success.json()).toEqual({ success: true });
  const wrong = { ...masked, config: { ...config, apiKey: "wrong" } };
  const failed = await request("/connectors/test", "POST", wrong);
  expect(failed.status).toBe(200);
  expect(await failed.json()).toEqual({ success: false, error: "错误密钥" });
  expect(stored(id)).toEqual(before);
});
test("manual polling respects the fifteen second cooldown and exposes latest mirrors", async () => {
  const { id } = await create();
  for (let i = 0; i < 2; i++) {
    const result = pollResultSchema.parse(
      await (await request(`/connectors/${id}/poll`, "POST")).json(),
    );
    expect(result.refreshed).toBe(false);
  }
  expect(calls).toBe(1);
  db.update(connectors)
    .set({ lastPolledAt: new Date(Date.now() - 20_000) })
    .where(eq(connectors.id, id))
    .run();
  const refreshed = await request(`/connectors/${id}/poll`, "POST");
  expect(pollResultSchema.parse(await refreshed.json()).refreshed).toBe(true);
  expect(calls).toBe(2);
});
test("agents read masked connectors and automation but cannot mutate connectors", async () => {
  const { id } = await create();
  const reader = { name: "Reader", kind: "codex", host: "test", capabilities: [] };
  const response = await request("/agents", "POST", reader);
  const agent = registeredAgentSchema.parse(await response.json());
  const list = await request("/connectors", "GET", undefined, agent.apiKey);
  expect(list.status).toBe(200);
  expect(z.array(connectorSchema).parse(await list.json())[0]?.config.apiKey).toBe("••••••");
  const jobsResponse = await request("/automation/jobs", "GET", undefined, agent.apiKey);
  expect(jobsResponse.status).toBe(200);
  const jobs = z.array(automationJobSchema).parse(await jobsResponse.json());
  expect(
    (await request(`/automation/runs?connectorId=${id}`, "GET", undefined, agent.apiKey)).status,
  ).toBe(200);
  const runs = await request(
    `/automation/jobs/${jobs[0]?.id}/runs`,
    "GET",
    undefined,
    agent.apiKey,
  );
  expect(runs.status).toBe(200);
  for (const [path, method] of [
    ["/connectors", "POST"],
    [`/connectors/${id}`, "PATCH"],
    [`/connectors/${id}`, "DELETE"],
    ["/connectors/test", "POST"],
    [`/connectors/${id}/poll`, "POST"],
  ])
    expect((await request(path as string, method, {}, agent.apiKey)).status).toBe(403);
});
test("deletion cascades and missing resources return 404", async () => {
  const { id } = await create();
  expect((await request(`/connectors/${id}`, "DELETE")).status).toBe(204);
  expect((await request(`/connectors/${id}`, "PATCH", {})).status).toBe(404);
  expect(db.select().from(automationJobs).all()).toEqual([]);
  expect(db.select().from(automationRuns).all()).toEqual([]);
  for (const [path, method] of [
    [`/connectors/${id}`, "DELETE"],
    [`/connectors/${id}/poll`, "POST"],
    ["/automation/jobs/missing/runs", "GET"],
  ])
    expect((await request(path as string, method)).status).toBe(404);
});
test("OpenAPI includes every connector and automation operation", async () => {
  const schema = z.object({ paths: z.record(z.string(), z.record(z.string(), z.unknown())) });
  const document = schema.parse(await (await app.request("/api/openapi.json")).json());
  for (const [path, methods] of Object.entries({
    "/connectors": ["get", "post"],
    "/connectors/{id}": ["patch", "delete"],
    "/connectors/test": ["post"],
    "/connectors/{id}/poll": ["post"],
    "/automation/jobs": ["get"],
    "/automation/runs": ["get"],
    "/automation/jobs/{id}/runs": ["get"],
  }))
    for (const method of methods) expect(document.paths[`/api/v1${path}`]).toHaveProperty(method);
});

test("connector runs include every job, sorted newest first and scoped to the connector", async () => {
  const { id } = await create();
  const other = await create();
  const job = db
    .select()
    .from(automationJobs)
    .where(eq(automationJobs.connectorId, id))
    .all()
    .find((job) => job.name === "Z");
  if (!job) throw new Error("Fixture job missing");
  db.insert(automationRuns)
    .values({
      jobId: job.id,
      externalId: "3",
      status: "running",
      startedAt: new Date("2026-10-14T12:00:03Z"),
    })
    .run();
  const response = await request(`/automation/runs?connectorId=${id}`);
  expect(response.status).toBe(200);
  const runs = z.array(automationRunWithJobSchema).parse(await response.json());
  expect(runs.map((run) => [run.externalId, run.jobName])).toEqual([
    ["3", "Z"],
    ["2", "A"],
    ["1", "A"],
  ]);
  expect(
    z
      .array(automationRunWithJobSchema)
      .parse(await (await request(`/automation/runs?connectorId=${other.id}`)).json()),
  ).toHaveLength(2);
  expect(await (await request("/automation/runs?connectorId=missing")).json()).toEqual([]);
  expect((await request("/automation/runs")).status).toBe(400);
});
