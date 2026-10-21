import { personSchema } from "@idesk/shared/people-schemas";
import { eq } from "drizzle-orm";
import { beforeEach, expect, test } from "vitest";
import { consumeBindCode, createBindCode } from "../core/people/codes.ts";
import { createTask, getTask } from "../core/tasks/store.ts";
import { db } from "../db/client.ts";
import { assistantSessions, people, personBindings, taskOrigins } from "../db/schema.ts";
import { newPerson, peopleCookie, peopleRequest } from "./people-fixture.ts";

let cookie: string;
beforeEach(async () => {
  db.delete(people).run();
  cookie = await peopleCookie();
});
test("CRUD trims names, enforces uniqueness and validates input at the boundary", async () => {
  const person = await newPerson(cookie, " 张三 ");
  expect(person).toMatchObject({
    name: "张三",
    bindings: [],
    id: expect.stringMatching(/^p_[0-9A-HJKMNP-TV-Z]{26}$/),
  });
  expect(
    (await peopleRequest("/people", cookie, "POST", { name: "张三", role: "viewer" })).status,
  ).toBe(409);
  for (const name of [" ", "x".repeat(21)])
    expect((await peopleRequest("/people", cookie, "POST", { name, role: "member" })).status).toBe(
      400,
    );
  expect(
    (await peopleRequest("/people", cookie, "POST", { name: "x", role: "admin" })).status,
  ).toBe(400);
  const second = await newPerson(cookie, "李四");
  expect(
    (await peopleRequest(`/people/${second.id}`, cookie, "PATCH", { name: " 张三 " })).status,
  ).toBe(409);
  expect((await peopleRequest(`/people/${person.id}`, cookie, "PATCH", {})).status).toBe(400);
  const updated = await peopleRequest(`/people/${person.id}`, cookie, "PATCH", {
    name: " 新名字 ",
    role: "viewer",
  });
  expect(personSchema.parse(await updated.json())).toMatchObject({
    name: "新名字",
    role: "viewer",
    bindings: [],
  });
  for (const [path, method, body] of [
    ["/people/missing", "PATCH", { name: "ok" }],
    ["/people/missing", "DELETE", undefined],
    ["/people/missing/bind-code", "POST", undefined],
  ] as const)
    expect((await peopleRequest(path, cookie, method, body)).status).toBe(404);
});
test("listing includes every binding and unbinding is scoped to its person", async () => {
  const person = await newPerson(cookie);
  for (const channel of ["feishu", "dingtalk", "wecom"] as const) {
    const result = consumeBindCode(createBindCode(person.id).code, {
      channel,
      externalId: "user",
      displayName: "Platform name",
    });
    expect(result.ok).toBe(true);
  }
  const listing = await peopleRequest("/people", cookie);
  const rows = (await listing.json()) as { id: string; bindings: { id: string }[] }[];
  expect(rows[0]?.bindings).toHaveLength(3);
  const binding = rows[0]?.bindings[0] as { id: string };
  const other = await newPerson(cookie, "李四");
  expect(
    (await peopleRequest(`/people/${other.id}/bindings/${binding.id}`, cookie, "DELETE")).status,
  ).toBe(404);
  expect(
    (await peopleRequest(`/people/${person.id}/bindings/${binding.id}`, cookie, "DELETE")).status,
  ).toBe(204);
  expect(
    db.select().from(personBindings).where(eq(personBindings.personId, person.id)).all(),
  ).toHaveLength(2);
});
test("deleting a person clears bindings, sessions and origins while preserving the entire historical task", async () => {
  const person = await newPerson(cookie);
  consumeBindCode(createBindCode(person.id).code, {
    channel: "feishu",
    externalId: "user",
    displayName: "Name",
  });
  const task = createTask({ title: "history", body: "all fields", priority: "high" }, person.id, {
    personId: person.id,
    via: "feishu",
  });
  db.insert(assistantSessions)
    .values({
      channel: "feishu",
      chatId: "chat",
      personId: person.id,
      history: [{ role: "user", content: "hi" }],
      draft: { kind: "cancel", taskId: task.id },
    })
    .run();
  db.insert(taskOrigins)
    .values({ taskId: task.id, channel: "feishu", chatId: "chat", personId: person.id })
    .run();
  const pending = createBindCode(person.id);
  expect((await peopleRequest(`/people/${person.id}`, cookie, "DELETE")).status).toBe(204);
  expect(db.select().from(personBindings).all()).toEqual([]);
  expect(db.select().from(assistantSessions).all()).toEqual([]);
  expect(db.select().from(taskOrigins).all()).toEqual([]);
  expect(getTask(task.id)).toEqual(task);
  expect(
    consumeBindCode(pending.code, { channel: "wecom", externalId: "later", displayName: "Later" }),
  ).toMatchObject({ ok: false, reason: "invalidCode" });
});
