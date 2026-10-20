import { sql } from "drizzle-orm";
import { expect, test } from "vitest";
import { db } from "../../db/client.ts";
import { assistantSessions, personBindings, taskOrigins } from "../../db/schema.ts";
import { createTask, getTask } from "../tasks/store.ts";
import { consumeBindCode, createBindCode } from "./codes.ts";
import { createPerson, deletePerson, getPerson } from "./people.ts";

test("a failure deleting an origin rolls back the person, bindings and sessions together", () => {
  const person = createPerson({ name: "rollback", role: "member" });
  consumeBindCode(createBindCode(person.id).code, {
    channel: "wecom",
    externalId: "rollback",
    displayName: "name",
  });
  const task = createTask({ title: "rollback task" }, person.id, {
    personId: person.id,
    via: "wecom",
  });
  db.insert(assistantSessions)
    .values({ channel: "wecom", chatId: "chat", personId: person.id })
    .run();
  db.insert(taskOrigins)
    .values({ taskId: task.id, channel: "wecom", chatId: "chat", personId: person.id })
    .run();
  db.run(
    sql`CREATE TRIGGER stop_origin_delete BEFORE DELETE ON task_origins BEGIN SELECT RAISE(ABORT, 'test deletion failure'); END`,
  );
  try {
    expect(() => deletePerson(person.id)).toThrow();
    expect(getPerson(person.id)).toMatchObject({ name: "rollback" });
    expect(db.select().from(personBindings).all()).toHaveLength(1);
    expect(db.select().from(assistantSessions).all()).toHaveLength(1);
    expect(db.select().from(taskOrigins).all()).toHaveLength(1);
    expect(getTask(task.id)).toEqual(task);
  } finally {
    db.run(sql`DROP TRIGGER stop_origin_delete`);
  }
});
