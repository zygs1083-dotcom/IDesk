import { eq } from "drizzle-orm";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { db } from "../../db/client.ts";
import { people, personBindings } from "../../db/schema.ts";
import { onEvent } from "../events/bus.ts";
import { consumeBindCode, createBindCode } from "./codes.ts";
import { createPerson, getBoundPerson, unbindPerson } from "./people.ts";

const input = { channel: "feishu", externalId: "open_id", displayName: "First name" } as const;
beforeEach(() => {
  db.delete(people).run();
});
afterEach(() => {
  vi.useRealTimers();
});
test("regeneration invalidates the previous code, successful use is once-only and expiry is ten minutes", () => {
  const person = createPerson({ name: "codes", role: "member" });
  vi.useFakeTimers();
  const first = createBindCode(person.id);
  const next = createBindCode(person.id);
  expect(next.code).toMatch(/^\d{6}$/);
  expect(next.expiresAt.getTime() - Date.now()).toBe(600_000);
  expect(consumeBindCode(first.code, input)).toMatchObject({ ok: false, reason: "invalidCode" });
  expect(consumeBindCode(next.code, input)).toMatchObject({ ok: true, person: { id: person.id } });
  expect(consumeBindCode(next.code, input)).toMatchObject({ ok: false, reason: "invalidCode" });
  const expired = createBindCode(person.id);
  vi.advanceTimersByTime(600_000);
  expect(consumeBindCode(expired.code, { ...input, channel: "wecom" })).toMatchObject({
    ok: false,
    reason: "invalidCode",
  });
  expect(db.select().from(personBindings).all()).toHaveLength(1);
});
test("a platform identity cannot move to another person until unbound; conflict leaves the code usable", () => {
  const first = createPerson({ name: "first", role: "member" });
  const second = createPerson({ name: "second", role: "viewer" });
  const seen: { type: string; payload: Record<string, unknown> }[] = [];
  const off = onEvent("*", (event) => seen.push(event));
  const bound = consumeBindCode(createBindCode(first.id).code, input);
  expect(bound.ok).toBe(true);
  const code = createBindCode(second.id).code;
  expect(consumeBindCode(code, input)).toMatchObject({ ok: false, reason: "alreadyBound" });
  expect(getBoundPerson("feishu", input.externalId)?.id).toBe(first.id);
  if (!bound.ok) throw new Error("Expected binding");
  expect(unbindPerson(second.id, bound.binding.id)).toBe(false);
  expect(unbindPerson(first.id, bound.binding.id)).toBe(true);
  expect(consumeBindCode(code, input)).toMatchObject({
    ok: true,
    person: { id: second.id, role: "viewer" },
  });
  off();
  expect(seen.map(({ type, payload }) => ({ type, payload }))).toEqual([
    { type: "person.bound", payload: { personId: first.id, channel: "feishu" } },
    { type: "person.unbound", payload: { personId: first.id, channel: "feishu" } },
    { type: "person.bound", payload: { personId: second.id, channel: "feishu" } },
  ]);
});
test("rebinding the same person preserves the captured display name and accepts independent platform identities", () => {
  const person = createPerson({ name: "multiple", role: "member" });
  consumeBindCode(createBindCode(person.id).code, input);
  consumeBindCode(createBindCode(person.id).code, { ...input, displayName: "Renamed" });
  for (const channel of ["dingtalk", "wecom"] as const)
    expect(consumeBindCode(createBindCode(person.id).code, { ...input, channel }).ok).toBe(true);
  const bindings = db
    .select()
    .from(personBindings)
    .where(eq(personBindings.personId, person.id))
    .all();
  expect(bindings).toHaveLength(3);
  expect(bindings.find((binding) => binding.channel === "feishu")?.displayName).toBe("First name");
});
