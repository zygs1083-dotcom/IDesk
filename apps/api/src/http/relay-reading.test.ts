import { relayMessageSchema } from "@idesk/shared/relay-schemas";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { expect, test } from "vitest";
import { z } from "zod";
import { registerAgent } from "../core/agents/agents.ts";
import { sendRelay } from "../core/relay/relay.ts";
import { db } from "../db/client.ts";
import { app } from "./app.ts";

migrate(db, { migrationsFolder: new URL("../../drizzle", import.meta.url).pathname });
test("relay routes preserve arrays and enforce pagination boundaries and detail visibility", async () => {
  const { agent, apiKey } = registerAgent({
    name: "relay reader",
    kind: "codex",
    host: "test",
    capabilities: [],
  });
  const visible = sendRelay(
    { to: { kind: "agent", id: agent.id }, kind: "request", subject: "search", body: "body" },
    "human",
  );
  const hidden = sendRelay(
    { to: { kind: "capability", value: "secret" }, kind: "note", subject: "hidden" },
    "human",
  );
  const get = (path: string) =>
    app.request(`/api/v1/relay${path}`, { headers: { Authorization: `Bearer ${apiKey}` } });
  const legacy = await get("");
  expect(legacy.status).toBe(200);
  expect(
    z
      .array(relayMessageSchema)
      .parse(await legacy.json())
      .map((m) => m.id),
  ).toContain(visible.id);
  for (const query of [
    "limit=0",
    "limit=101",
    "limit=1.5",
    "limit=no",
    "requestStatus=other",
    "hasTask=no",
  ]) {
    expect((await get(`?${query}`)).status).toBe(400);
  }
  expect((await get(`?limit=1&before=${hidden.id}`)).status).toBe(404);
  const detail = await get(`/${visible.id}`);
  expect(detail.status).toBe(200);
  expect(relayMessageSchema.parse(await detail.json())).toMatchObject({ body: "body", readBy: [] });
  const thread = await get(`/${visible.id}/thread`);
  expect(z.array(relayMessageSchema).parse(await thread.json())).toHaveLength(1);
  for (const suffix of ["", "/thread"]) {
    const missing = await get(`/missing${suffix}`);
    const invisible = await get(`/${hidden.id}${suffix}`);
    expect(invisible.status).toBe(404);
    expect(await invisible.json()).toEqual(await missing.json());
  }
});
