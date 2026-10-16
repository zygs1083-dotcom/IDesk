import { registeredAgentSchema } from "@idesk/shared/agent-schemas";
import { relayMessageSchema } from "@idesk/shared/relay-schemas";
import { scheduleSchema } from "@idesk/shared/schedule-schemas";
import { taskSchema } from "@idesk/shared/task-schemas";
import { eq } from "drizzle-orm";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { beforeAll, expect, test } from "vitest";
import { db } from "../db/client.ts";
import { agents, relayMessages, schedules, tasks } from "../db/schema.ts";
import { app } from "./app.ts";

migrate(db, { migrationsFolder: new URL("../../drizzle", import.meta.url).pathname });
let cookie: string;
beforeAll(async () => {
  const response = await app.request("/api/v1/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ password: "test" }),
  });
  cookie = (response.headers.get("Set-Cookie") as string).split(";")[0] as string;
});
function request(path: string, body: object, method = "POST", lang = "zh") {
  return app.request(`/api/v1${path}`, {
    method,
    headers: { Cookie: cookie, "Content-Type": "application/json", "Accept-Language": lang },
    body: JSON.stringify(body),
  });
}
const values = [" Coding ", "CODING", " Front   End "];
const normalized = ["coding", "front-end"];
const agentInput = {
  name: "w79-normalized-agent",
  kind: "codex",
  host: "w79",
  capabilities: values,
};
const template = { title: "w79-normalized-template-task", capabilities: values };
const scheduleInput = {
  name: "w79-normalized-schedule",
  cron: "0 9 * * *",
  enabled: false,
  action: { type: "publish_task", template },
};

test("REST normalizes all capability writes in persistent storage", async () => {
  const registration = await request("/agents", agentInput);
  expect(registration.status).toBe(201);
  const { agent } = registeredAgentSchema.parse(await registration.json());
  expect(db.select().from(agents).where(eq(agents.id, agent.id)).get()?.capabilities).toEqual(
    normalized,
  );
  const patch = await request(
    `/agents/${agent.id}`,
    { capabilities: [" REVIEW ", "Review"] },
    "PATCH",
  );
  expect(patch.status).toBe(200);
  expect(db.select().from(agents).where(eq(agents.id, agent.id)).get()?.capabilities).toEqual([
    "review",
  ]);
  const published = await request("/tasks", {
    title: "w79-normalized-rest-task",
    capabilities: values,
  });
  expect(published.status).toBe(201);
  const task = taskSchema.parse(await published.json());
  expect(db.select().from(tasks).where(eq(tasks.id, task.id)).get()?.capabilities).toEqual(
    normalized,
  );
  const scheduled = await request("/schedules", scheduleInput);
  expect(scheduled.status).toBe(201);
  const schedule = scheduleSchema.parse(await scheduled.json());
  expect(
    db.select().from(schedules).where(eq(schedules.id, schedule.id)).get()?.action,
  ).toMatchObject({ template: { capabilities: normalized } });
  expect(
    (
      await request(
        `/schedules/${schedule.id}`,
        {
          action: {
            type: "publish_task",
            template: { ...template, capabilities: [" Testing ", "testing"] },
          },
        },
        "PATCH",
      )
    ).status,
  ).toBe(200);
  expect(
    db.select().from(schedules).where(eq(schedules.id, schedule.id)).get()?.action,
  ).toMatchObject({ template: { capabilities: ["testing"] } });
  const sent = await request("/relay", {
    to: { kind: "capability", value: " Front   End " },
    kind: "note",
    subject: "w79-normalized-relay",
  });
  expect(sent.status).toBe(201);
  const message = relayMessageSchema.parse(await sent.json());
  expect(db.select().from(relayMessages).where(eq(relayMessages.id, message.id)).get()?.to).toEqual(
    { kind: "capability", value: "front-end" },
  );
  await app.request(`/api/v1/schedules/${schedule.id}`, {
    method: "DELETE",
    headers: { Cookie: cookie },
  });
});

test.each(["zh", "en"])(
  "invalid capability writes return 400 for %s requests with Zod Chinese errors",
  async (lang) => {
    const registration = registeredAgentSchema.parse(
      await (await request("/agents", { ...agentInput, name: `w79-invalid-agent-${lang}` })).json(),
    );
    const created = scheduleSchema.parse(
      await (
        await request("/schedules", { ...scheduleInput, name: `w79-invalid-schedule-${lang}` })
      ).json(),
    );
    for (const value of [" ", "x".repeat(33), "a,b"]) {
      const writes = [
        ["/agents", { ...agentInput, capabilities: [value] }, "POST"],
        [`/agents/${registration.agent.id}`, { capabilities: [value] }, "PATCH"],
        ["/tasks", { title: `w79-invalid-task-${lang}`, capabilities: [value] }, "POST"],
        [
          "/schedules",
          {
            ...scheduleInput,
            action: { type: "publish_task", template: { ...template, capabilities: [value] } },
          },
          "POST",
        ],
        [
          `/schedules/${created.id}`,
          { action: { type: "publish_task", template: { ...template, capabilities: [value] } } },
          "PATCH",
        ],
        [
          "/relay",
          { to: { kind: "capability", value }, kind: "note", subject: `w79-invalid-relay-${lang}` },
          "POST",
        ],
      ] as const;
      for (const [path, input, method] of writes) {
        const response = await request(path, input, method, lang);
        expect(response.status).toBe(400);
        expect(await response.json()).toEqual({ error: "能力须为 1–32 个字符，不能含逗号" });
      }
    }
    await app.request(`/api/v1/schedules/${created.id}`, {
      method: "DELETE",
      headers: { Cookie: cookie },
    });
  },
);
