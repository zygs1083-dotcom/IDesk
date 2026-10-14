import { eventSchema } from "@idesk/shared/task-schemas";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { expect, test } from "vitest";
import { z } from "zod";
import { db } from "../../db/client.ts";
import { app } from "../../http/app.ts";
import { emitEvent } from "./bus.ts";

migrate(db, { migrationsFolder: new URL("../../../drizzle", import.meta.url).pathname });

test("incremental activity returns the earliest 200 events and drains the remaining backlog", async () => {
  const login = await app.request("/api/v1/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ password: "test" }),
  });
  expect(login.status).toBe(200);
  const headers = { Cookie: (login.headers.get("Set-Cookie") as string).split(";")[0] as string };
  const events = Array.from({ length: 205 }, () => emitEvent({ type: "test.backlog" })).sort(
    (a, b) => a.id.localeCompare(b.id),
  );
  const first = await app.request(`/api/v1/events?since=${events[0]?.id}`, { headers });
  expect(first.status).toBe(200);
  const batch = z.array(eventSchema).parse(await first.json());
  expect(batch.map((event) => event.id)).toEqual(events.slice(1, 201).map((event) => event.id));
  const second = await app.request(`/api/v1/events?since=${batch.at(-1)?.id}`, { headers });
  expect(second.status).toBe(200);
  const remaining = z.array(eventSchema).parse(await second.json());
  expect(remaining.map((event) => event.id)).toEqual(events.slice(201).map((event) => event.id));
});
