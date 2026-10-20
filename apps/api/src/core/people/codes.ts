import { randomInt } from "node:crypto";
import type { ImChannel } from "@idesk/shared/people-schemas";
import { and, eq } from "drizzle-orm";
import { db } from "../../db/client.ts";
import { people, personBindings } from "../../db/schema.ts";
import { HttpError } from "../../http/errors.ts";
import { publishEvent, recordEvent } from "../events/bus.ts";

const codes = new Map<string, { personId: string; expiresAt: Date }>();
const CODE_TTL_MS = 10 * 60_000;

export function invalidateBindCode(personId: string): void {
  for (const [code, entry] of codes) if (entry.personId === personId) codes.delete(code);
}

export function createBindCode(personId: string) {
  if (!db.select({ id: people.id }).from(people).where(eq(people.id, personId)).get())
    throw new HttpError(404, "person.notFound");
  const now = Date.now();
  let previousCode: string | undefined;
  for (const [code, entry] of codes) {
    if (entry.personId === personId) previousCode = code;
    if (entry.personId === personId || entry.expiresAt.getTime() <= now) codes.delete(code);
  }
  let code: string;
  do {
    code = randomInt(1_000_000).toString().padStart(6, "0");
  } while (codes.has(code) || code === previousCode);
  const expiresAt = new Date(now + CODE_TTL_MS);
  codes.set(code, { personId, expiresAt });
  return { code, expiresAt };
}

export function consumeBindCode(
  code: string,
  input: { channel: ImChannel; externalId: string; displayName: string },
) {
  const entry = codes.get(code);
  if (!entry || entry.expiresAt.getTime() <= Date.now()) {
    codes.delete(code);
    return { ok: false, reason: "invalidCode" } as const;
  }
  const result = db.transaction((tx) => {
    const person = tx.select().from(people).where(eq(people.id, entry.personId)).get();
    if (!person) return { ok: false, reason: "invalidCode" } as const;
    const existing = tx
      .select()
      .from(personBindings)
      .where(
        and(
          eq(personBindings.channel, input.channel),
          eq(personBindings.externalId, input.externalId),
        ),
      )
      .get();
    if (existing && existing.personId !== person.id)
      return { ok: false, reason: "alreadyBound" } as const;
    if (existing) return { ok: true, person, binding: existing } as const;
    const binding = tx
      .insert(personBindings)
      .values({ ...input, personId: person.id })
      .returning()
      .get();
    const event = recordEvent(tx, {
      type: "person.bound",
      payload: { personId: person.id, channel: input.channel },
    });
    return { ok: true, person, binding, event } as const;
  });
  if (result.ok) {
    codes.delete(code);
    if ("event" in result) publishEvent(result.event);
  }
  return result;
}
