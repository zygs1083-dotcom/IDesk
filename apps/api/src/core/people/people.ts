import type {
  createPersonSchema,
  ImChannel,
  patchPersonSchema,
} from "@idesk/shared/people-schemas";
import { and, eq, ne } from "drizzle-orm";
import type { z } from "zod";
import { db } from "../../db/client.ts";
import { people, personBindings } from "../../db/schema.ts";
import { HttpError } from "../../http/errors.ts";
import { publishEvent, recordEvent } from "../events/bus.ts";
import { invalidateBindCode } from "./codes.ts";

export function getPerson(id: string) {
  return db.select().from(people).where(eq(people.id, id)).get();
}

export function listPeople() {
  const bindings = db.select().from(personBindings).all();
  return db
    .select()
    .from(people)
    .all()
    .map((person) => ({
      ...person,
      bindings: bindings.filter((binding) => binding.personId === person.id),
    }));
}

export function getBoundPerson(channel: ImChannel, externalId: string) {
  return db
    .select({ person: people })
    .from(personBindings)
    .innerJoin(people, eq(people.id, personBindings.personId))
    .where(and(eq(personBindings.channel, channel), eq(personBindings.externalId, externalId)))
    .get()?.person;
}

export function createPerson(input: z.infer<typeof createPersonSchema>) {
  const person = db.insert(people).values(input).onConflictDoNothing().returning().get();
  if (!person) throw new HttpError(409, "person.nameTaken");
  return { ...person, bindings: [] };
}

export function patchPerson(id: string, input: z.infer<typeof patchPersonSchema>) {
  if (!getPerson(id)) throw new HttpError(404, "person.notFound");
  if (
    input.name !== undefined &&
    db
      .select({ id: people.id })
      .from(people)
      .where(and(eq(people.name, input.name), ne(people.id, id)))
      .get()
  )
    throw new HttpError(409, "person.nameTaken");
  const person = db.update(people).set(input).where(eq(people.id, id)).returning().get();
  const bindings = db.select().from(personBindings).where(eq(personBindings.personId, id)).all();
  return { ...person, bindings };
}

export function deletePerson(id: string): boolean {
  const recorded = db.transaction((tx) => {
    const bindings = tx.select().from(personBindings).where(eq(personBindings.personId, id)).all();
    if (!tx.delete(people).where(eq(people.id, id)).returning().get()) return undefined;
    return bindings.map((binding) =>
      recordEvent(tx, {
        type: "person.unbound",
        payload: { personId: id, channel: binding.channel },
      }),
    );
  });
  if (!recorded) return false;
  invalidateBindCode(id);
  for (const event of recorded) publishEvent(event);
  return true;
}

export function unbindPerson(personId: string, bindingId: string): boolean {
  const event = db.transaction((tx) => {
    const binding = tx
      .delete(personBindings)
      .where(and(eq(personBindings.personId, personId), eq(personBindings.id, bindingId)))
      .returning()
      .get();
    if (!binding) return undefined;
    return recordEvent(tx, {
      type: "person.unbound",
      payload: { personId, channel: binding.channel },
    });
  });
  if (!event) return false;
  publishEvent(event);
  return true;
}
