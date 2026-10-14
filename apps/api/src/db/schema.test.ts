import { eq } from "drizzle-orm";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { expect, test } from "vitest";
import { db } from "./client.ts";
import { automationJobs, automationRuns, connectors, relayMessages, tasks } from "./schema.ts";

test("migrations provide task defaults and cascade connector deletion to jobs and runs", () => {
  migrate(db, { migrationsFolder: new URL("../../drizzle", import.meta.url).pathname });

  const task = db
    .insert(tasks)
    .values({ title: "Schema integration test", publisherId: "human" })
    .returning()
    .get();
  const storedTask = db.select().from(tasks).where(eq(tasks.id, task.id)).get();

  expect(storedTask).toMatchObject({
    id: expect.stringMatching(/^[0-9A-HJKMNP-TV-Z]{26}$/),
    status: "open",
    priority: "normal",
    tags: [],
    createdAt: expect.any(Date),
  });

  const message = db
    .insert(relayMessages)
    .values({ fromAgentId: "human", to: { kind: "broadcast" }, kind: "note", subject: "Test" })
    .returning()
    .get();
  const storedMessage = db
    .select()
    .from(relayMessages)
    .where(eq(relayMessages.id, message.id))
    .get();

  expect(storedMessage).toMatchObject({ readBy: [], to: { kind: "broadcast" } });

  const connector = db
    .insert(connectors)
    .values({ pluginId: "test", name: "Test connector", config: {} })
    .returning()
    .get();
  const job = db
    .insert(automationJobs)
    .values({ connectorId: connector.id, externalId: "test-job", name: "Test job" })
    .returning()
    .get();
  const run = db
    .insert(automationRuns)
    .values({ jobId: job.id, externalId: "test-run", status: "waiting" })
    .returning()
    .get();

  db.delete(connectors).where(eq(connectors.id, connector.id)).run();

  expect(
    db.select().from(automationJobs).where(eq(automationJobs.id, job.id)).get(),
  ).toBeUndefined();
  expect(
    db.select().from(automationRuns).where(eq(automationRuns.id, run.id)).get(),
  ).toBeUndefined();
});
