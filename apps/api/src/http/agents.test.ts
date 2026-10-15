import { publicAgentSchema, registeredAgentSchema } from "@idesk/shared/agent-schemas";
import { taskSchema } from "@idesk/shared/task-schemas";
import { eq } from "drizzle-orm";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { expect, test } from "vitest";
import { db } from "../db/client.ts";
import { events } from "../db/schema.ts";
import { app } from "./app.ts";

migrate(db, { migrationsFolder: new URL("../../drizzle", import.meta.url).pathname });
function request(path: string, credential: string, method = "GET", body?: object) {
  return app.request(`/api/v1${path}`, {
    method,
    headers: {
      ...(credential.startsWith("idk_")
        ? { Authorization: `Bearer ${credential}` }
        : { Cookie: credential }),
      "Content-Type": "application/json",
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
}
async function fixture() {
  const login = await request("/auth/login", "", "POST", { password: "test" });
  const cookie = (login.headers.get("Set-Cookie") as string).split(";")[0] as string;
  const response = await request("/agents", cookie, "POST", {
    name: "worker",
    kind: "codex",
    host: "test",
    capabilities: ["coding"],
    webhookUrl: "https://example.com/hook",
  });
  return { cookie, ...registeredAgentSchema.parse(await response.json()) };
}

test("human patches agent fields, clears webhook and records updated identity", async () => {
  const { cookie, agent, apiKey } = await fixture();
  const path = `/agents/${agent.id}`;
  expect((await request(path, apiKey, "PATCH", { name: "forbidden" })).status).toBe(403);
  const input = { name: "renamed", host: "new-host", capabilities: ["browser"], webhookUrl: null };
  const response = await request(path, cookie, "PATCH", input);
  expect(response.status).toBe(200);
  const updated = publicAgentSchema.parse(await response.json());
  expect(updated).toMatchObject({ ...input, id: agent.id, kind: "codex" });
  expect(await (await request("/agents", cookie)).json()).toContainEqual(updated);
  expect(db.select().from(events).where(eq(events.agentId, agent.id)).all()).toContainEqual(
    expect.objectContaining({ type: "agent.updated", payload: { name: "renamed", kind: "codex" } }),
  );
  expect((await request(path, cookie, "PATCH", {})).status).toBe(200);
  expect((await request(path, cookie, "PATCH", { name: "" })).status).toBe(400);
  const missing = await request("/agents/missing", cookie, "PATCH", input);
  expect(missing.status).toBe(404);
  expect(await missing.json()).toEqual({ error: "智能体不存在" });
});

test("deletion revokes key and preserves active task and historical events", async () => {
  const { cookie, agent, apiKey } = await fixture();
  const task = taskSchema.parse(
    await (await request("/tasks", apiKey, "POST", { title: "Keep working" })).json(),
  );
  expect((await request(`/tasks/${task.id}/actions/claim`, apiKey, "POST", {})).status).toBe(200);
  const history = db.select().from(events).where(eq(events.agentId, agent.id)).all();
  expect((await request(`/agents/${agent.id}`, apiKey, "DELETE")).status).toBe(403);
  const response = await request(`/agents/${agent.id}`, cookie, "DELETE");
  expect(response.status).toBe(204);
  expect(await response.text()).toBe("");
  expect((await request("/agents/me", apiKey)).status).toBe(401);
  expect(taskSchema.parse(await (await request(`/tasks/${task.id}`, cookie)).json())).toMatchObject(
    { status: "in_progress", assigneeId: agent.id },
  );
  expect(db.select().from(events).where(eq(events.agentId, agent.id)).all()).toEqual(history);
  expect(db.select().from(events).where(eq(events.type, "agent.deleted")).all()).toContainEqual(
    expect.objectContaining({
      agentId: null,
      payload: { id: agent.id, name: agent.name, kind: agent.kind },
    }),
  );
  expect(await (await request("/agents", cookie)).json()).not.toContainEqual(
    expect.objectContaining({ id: agent.id }),
  );
  const missing = await request(`/agents/${agent.id}`, cookie, "DELETE");
  expect(missing.status).toBe(404);
  expect(await missing.json()).toEqual({ error: "智能体不存在" });
});
