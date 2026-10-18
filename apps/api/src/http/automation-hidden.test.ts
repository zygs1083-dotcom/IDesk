import { automationRunWithJobSchema } from "@idesk/shared/automation-schemas";
import { eq } from "drizzle-orm";
import { afterEach, expect, test } from "vitest";
import { config } from "../config.ts";
import { registerAgent } from "../core/agents/agents.ts";
import { db } from "../db/client.ts";
import { agents, automationJobs, automationRuns, connectors, events } from "../db/schema.ts";
import { storePoll } from "../plugins/poll-store.ts";
import type { ExternalJob, ExternalRun } from "../plugins/types.ts";
import { app } from "./app.ts";

const originalViewerPassword = config.IDESK_VIEWER_PASSWORD;
afterEach(() => {
  config.IDESK_VIEWER_PASSWORD = originalViewerPassword;
  db.delete(connectors).run();
  db.delete(events).run();
  db.delete(agents).run();
});
async function session(password: string) {
  const response = await app.request("/api/v1/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ password }),
  });
  return { Cookie: (response.headers.get("Set-Cookie") as string).split(";")[0] as string };
}
function patch(id: string, hidden: boolean, headers: Record<string, string>) {
  return app.request(`/api/v1/automation/runs/${id}`, {
    method: "PATCH",
    headers: { ...headers, "Content-Type": "application/json" },
    body: JSON.stringify({ hidden }),
  });
}
function fixture(status: ExternalRun["status"] = "success") {
  const connector = db
    .insert(connectors)
    .values({ pluginId: "fixture", name: "Fixture", config: {} })
    .returning()
    .get();
  const job: ExternalJob = {
    externalId: "job",
    name: "Import",
    group: "Warehouse",
    schedule: null,
    enabled: true,
    url: null,
  };
  const run: ExternalRun = {
    externalId: "run",
    jobExternalId: "job",
    status,
    startedAt: new Date(),
    finishedAt: null,
    trigger: null,
    url: null,
    error: null,
  };
  storePoll(connector, new Date(), [job], [run]);
  const storedJob = db
    .select()
    .from(automationJobs)
    .where(eq(automationJobs.connectorId, connector.id))
    .get() as typeof automationJobs.$inferSelect;
  const stored = db
    .select()
    .from(automationRuns)
    .where(eq(automationRuns.jobId, storedJob.id))
    .get() as typeof automationRuns.$inferSelect;
  return { connector, job, run, stored };
}

test.each(["success", "failed", "canceled"] as const)(
  "hide/unhide %s persists through polling and is idempotent",
  async (status) => {
    const { connector, job, run, stored } = fixture(status);
    const admin = await session("test");
    const read = async () => {
      const response = await app.request(`/api/v1/automation/runs?connectorId=${connector.id}`, {
        headers: admin,
      });
      expect(response.status).toBe(200);
      return automationRunWithJobSchema.parse((await response.json())[0]);
    };
    expect((await read()).hiddenAt).toBeNull();
    const before = Date.now();
    const response = await patch(stored.id, true, admin);
    expect(response.status).toBe(200);
    const hidden = automationRunWithJobSchema.parse(await response.json());
    expect(hidden.jobName).toBe("Import");
    expect(hidden.jobGroup).toBe("Warehouse");
    expect(new Date(hidden.hiddenAt as string).getTime()).toBeGreaterThanOrEqual(before);
    const fixed = new Date("2026-01-01T00:00:00Z");
    db.update(automationRuns)
      .set({ hiddenAt: fixed })
      .where(eq(automationRuns.id, stored.id))
      .run();
    const repeated = await patch(stored.id, true, admin);
    expect(repeated.status).toBe(200);
    expect(automationRunWithJobSchema.parse(await repeated.json()).hiddenAt).toBe(
      fixed.toISOString(),
    );
    storePoll(connector, new Date(), [job], [run]);
    expect((await read()).hiddenAt).toBe(fixed.toISOString());
    expect((await patch(stored.id, false, admin)).status).toBe(200);
    expect((await read()).hiddenAt).toBeNull();
    expect((await patch(stored.id, false, admin)).status).toBe(200);
    expect((await read()).hiddenAt).toBeNull();
  },
);

test("viewer and agent cannot hide or unhide, missing runs return 404", async () => {
  const { stored } = fixture();
  config.IDESK_VIEWER_PASSWORD = "viewer-test";
  const viewer = await session("viewer-test");
  const { apiKey } = registerAgent({
    name: "Agent",
    host: "test",
    kind: "codex",
    capabilities: [],
  });
  for (const hidden of [true, false]) {
    expect((await patch(stored.id, hidden, viewer)).status).toBe(403);
    expect((await patch(stored.id, hidden, { Authorization: `Bearer ${apiKey}` })).status).toBe(
      403,
    );
  }
  expect((await patch("missing", true, await session("test"))).status).toBe(404);
});

test.each(["waiting", "running"] as const)("%s runs reject visibility changes", async (status) => {
  const { stored } = fixture(status);
  const admin = await session("test");
  for (const hidden of [true, false]) {
    const response = await patch(stored.id, hidden, admin);
    expect(response.status).toBe(409);
    expect(await response.json()).toMatchObject({ error: expect.any(String) });
  }
});
