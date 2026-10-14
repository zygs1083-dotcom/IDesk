import { eq } from "drizzle-orm";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { expect, test } from "vitest";
import { db } from "./client.ts";
import { automationJobs, automationRuns, connectors, tasks } from "./schema.ts";

test("migrations provide task defaults and cascade connector deletion to jobs and runs", () => {
  migrate(db, { migrationsFolder: new URL("../../drizzle", import.meta.url).pathname });

  db.transaction((tx) => {
    const task = tx
      .insert(tasks)
      .values({ title: "Schema integration test", publisherId: "human" })
      .returning()
      .get();
    const storedTask = tx.select().from(tasks).where(eq(tasks.id, task.id)).get();

    expect(storedTask).toMatchObject({
      id: expect.stringMatching(/^[0-9A-HJKMNP-TV-Z]{26}$/),
      status: "open",
      priority: "normal",
      tags: [],
      createdAt: expect.any(Date),
    });

    const connector = tx
      .insert(connectors)
      .values({ pluginId: "test", name: "Test connector", config: {} })
      .returning()
      .get();
    const job = tx
      .insert(automationJobs)
      .values({ connectorId: connector.id, externalId: "test-job", name: "Test job" })
      .returning()
      .get();
    const run = tx
      .insert(automationRuns)
      .values({ jobId: job.id, externalId: "test-run", status: "waiting" })
      .returning()
      .get();

    expect(
      tx.select().from(automationJobs).where(eq(automationJobs.id, job.id)).get(),
    ).toBeDefined();
    expect(
      tx.select().from(automationRuns).where(eq(automationRuns.id, run.id)).get(),
    ).toBeDefined();

    tx.delete(connectors).where(eq(connectors.id, connector.id)).run();

    expect(
      tx.select().from(automationJobs).where(eq(automationJobs.id, job.id)).get(),
    ).toBeUndefined();
    expect(
      tx.select().from(automationRuns).where(eq(automationRuns.id, run.id)).get(),
    ).toBeUndefined();

    tx.delete(tasks).where(eq(tasks.id, task.id)).run();
  });
});
