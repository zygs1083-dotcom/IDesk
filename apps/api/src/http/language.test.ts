import { registeredAgentSchema } from "@idesk/shared/agent-schemas";
import { pluginSchema } from "@idesk/shared/plugin-schemas";
import { taskSchema } from "@idesk/shared/task-schemas";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { afterEach, expect, test } from "vitest";
import { z } from "zod";
import dolphinScheduler from "../../../../plugins/dolphinscheduler/index.ts";
import { db } from "../db/client.ts";
import { registerPlugin, stopPlugins } from "../plugins/registry.ts";
import { app } from "./app.ts";

migrate(db, { migrationsFolder: new URL("../../drizzle", import.meta.url).pathname });
afterEach(stopPlugins);

async function login() {
  const response = await app.request("/api/v1/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ password: "test" }),
  });
  return (response.headers.get("Set-Cookie") as string).split(";")[0] as string;
}

function request(path: string, credential: string, language?: string, body?: object) {
  return app.request(`/api/v1${path}`, {
    method: body ? "POST" : "GET",
    headers: {
      ...(credential.startsWith("idk_")
        ? { Authorization: `Bearer ${credential}` }
        : { Cookie: credential }),
      ...(language === undefined ? {} : { "Accept-Language": language }),
      "Content-Type": "application/json",
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
}

test("REST translates 409 and 404 responses while validation stays Chinese", async () => {
  const cookie = await login();
  const { apiKey } = registeredAgentSchema.parse(
    await (
      await request("/agents", cookie, undefined, {
        name: "language",
        kind: "codex",
        host: "test",
        capabilities: [],
      })
    ).json(),
  );
  const task = taskSchema.parse(
    await (await request("/tasks", apiKey, undefined, { title: "language" })).json(),
  );
  expect((await request(`/tasks/${task.id}/actions/claim`, apiKey, undefined, {})).status).toBe(
    200,
  );
  expect(
    (await request(`/tasks/${task.id}/actions/complete`, apiKey, undefined, { result: "done" }))
      .status,
  ).toBe(200);
  for (const [lang, conflict, missing] of [
    ["en", "Cannot claim a task that is done", "Task not found"],
    [undefined, "已完成的任务不能领取", "任务不存在"],
    ["zh-CN", "已完成的任务不能领取", "任务不存在"],
  ] as const) {
    const response = await request(`/tasks/${task.id}/actions/claim`, apiKey, lang, {});
    expect(response.status).toBe(409);
    expect(await response.json()).toEqual({ error: conflict });
    const absent = await request("/tasks/missing", cookie, lang);
    expect(absent.status).toBe(404);
    expect(await absent.json()).toEqual({ error: missing });
  }
  const invalid = await request("/tasks", apiKey, "en", {});
  expect(invalid.status).toBe(400);
  expect(await invalid.json()).toEqual({ error: expect.stringMatching(/[\u4e00-\u9fff]/) });
});

test("GET plugins returns translated DolphinScheduler titles without titleEn", async () => {
  await registerPlugin(
    dolphinScheduler,
    new URL("../../../../plugins/dolphinscheduler/index.ts", import.meta.url),
  );
  const cookie = await login();
  for (const [lang, title] of [
    ["en", "Project code (empty = all projects visible to the token)"],
    ["zh-CN", "项目编码（留空 = Token 可见的全部项目）"],
  ]) {
    const response = await request("/plugins", cookie, lang);
    expect(response.status).toBe(200);
    const plugins = z.array(pluginSchema).parse(await response.json());
    expect(plugins.find((plugin) => plugin.id === "dolphinscheduler")?.configSchema).toMatchObject({
      properties: { projectCode: { title } },
    });
    expect(JSON.stringify(plugins)).not.toContain("titleEn");
  }
});
