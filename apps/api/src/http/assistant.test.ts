import {
  assistantReplySchema,
  assistantSettingsSchema,
  assistantTestResultSchema,
} from "@idesk/shared/assistant-schemas";
import { afterEach, expect, test } from "vitest";
import { config } from "../config.ts";
import { registerAgent } from "../core/agents/agents.ts";
import { fakeModel, nativeReply, person } from "../core/assistant/fixture.ts";
import { modelSettings } from "../core/assistant/settings.ts";
import { db } from "../db/client.ts";
import { taskOrigins, tasks } from "../db/schema.ts";
import { app } from "./app.ts";

const previousViewer = config.IDESK_VIEWER_PASSWORD;
afterEach(() => {
  config.IDESK_VIEWER_PASSWORD = previousViewer;
});
async function cookie(password: string) {
  const response = await app.request("/api/v1/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ password }),
  });
  return (response.headers.get("Set-Cookie") as string).split(";")[0] as string;
}

test("assistant HTTP enforces admin/viewer/agent boundaries and returns only masked settings", async () => {
  config.IDESK_VIEWER_PASSWORD = "viewer-fixture";
  const admin = await cookie("test");
  const viewer = await cookie("viewer-fixture");
  const { apiKey } = registerAgent({
    name: "assistant auth",
    kind: "codex",
    host: "test",
    capabilities: [],
  });
  const paths = [
    ["settings", "GET"],
    ["settings", "PUT"],
    ["test", "POST"],
    ["chat", "POST"],
    ["channels", "GET"],
  ] as const;
  for (const [path, method] of paths) {
    expect((await app.request(`/api/v1/assistant/${path}`, { method })).status).toBe(401);
    expect(
      (
        await app.request(`/api/v1/assistant/${path}`, {
          method,
          headers: { Authorization: `Bearer ${apiKey}` },
        })
      ).status,
    ).toBe(403);
    expect(
      (await app.request(`/api/v1/assistant/${path}`, { method, headers: { Cookie: viewer } }))
        .status,
    ).toBe(path === "channels" ? 200 : 403);
  }
  const headers = { Cookie: admin, "Content-Type": "application/json" };
  const requests = await fakeModel(() => nativeReply("openai-chat"));
  const settings = await app.request("/api/v1/assistant/settings", { headers });
  expect(assistantSettingsSchema.parse(await settings.json()).apiKey).toBe("••••••");
  const changed = await app.request("/api/v1/assistant/settings", {
    method: "PUT",
    headers,
    body: JSON.stringify({ ...modelSettings(), apiKey: "••••••", model: "changed-model" }),
  });
  expect(changed.status).toBe(200);
  expect(assistantSettingsSchema.parse(await changed.json()).apiKey).toBe("••••••");
  expect(modelSettings().apiKey).toBe("fake-model-key");
  const tested = await app.request("/api/v1/assistant/test", { method: "POST", headers });
  expect(assistantTestResultSchema.parse(await tested.json())).toMatchObject({
    ok: true,
    error: null,
  });
  expect(requests).toHaveLength(1);
  expect(JSON.stringify(requests[0]?.body.messages)).toContain("Hello");
  const invalid = await app.request("/api/v1/assistant/settings", {
    method: "PUT",
    headers,
    body: JSON.stringify({ protocol: "bad" }),
  });
  expect(invalid.status).toBe(400);
  const missing = await app.request("/api/v1/assistant/chat", {
    method: "POST",
    headers: { ...headers, "Accept-Language": "en" },
    body: JSON.stringify({ personId: "missing", text: "hi" }),
  });
  expect(missing.status).toBe(400);
  expect(await missing.json()).toEqual({ error: "Person not found" });
});

test("web text button ids deterministically change priorities, publish, discard and confirm cancellation", async () => {
  const publisher = person();
  const headers = { Cookie: await cookie("test"), "Content-Type": "application/json" };
  let cancelTaskId: string | undefined;
  const requests = await fakeModel((_request, turn) =>
    nativeReply(
      "openai-chat",
      turn % 2 === 1
        ? [
            cancelTaskId
              ? { name: "request_cancel", input: { taskId: cancelTaskId } }
              : { name: "draft_task", input: { title: "HTTP draft" } },
          ]
        : [],
    ),
  );
  const chat = (text: string) =>
    app.request("/api/v1/assistant/chat", {
      method: "POST",
      headers,
      body: JSON.stringify({ personId: publisher.id, text }),
    });
  expect(assistantReplySchema.parse(await (await chat("准备草稿")).json()).options).toHaveLength(6);
  for (const text of ["1", "2", "3", "4"]) {
    const response = assistantReplySchema.parse(await (await chat(text)).json());
    expect(response.options?.find((option) => option.id === text)?.label).toContain("✓");
  }
  await chat("cancel");
  expect(db.select().from(tasks).all()).toHaveLength(0);
  expect(requests).toHaveLength(2);
  await chat("重新准备草稿");
  expect(assistantReplySchema.parse(await (await chat("publish")).json()).text).toContain(
    "已发布：HTTP draft",
  );
  expect(requests).toHaveLength(4);
  await chat("publish");
  expect(requests).toHaveLength(4);
  const task = db.select().from(tasks).get();
  expect(task).toMatchObject({ publisherId: publisher.id, status: "open" });
  expect(db.select().from(taskOrigins).all()).toHaveLength(0);
  cancelTaskId = task?.id;
  await chat("准备取消");
  expect(requests).toHaveLength(6);
  await chat("cancel");
  expect(db.select().from(tasks).get()?.status).toBe("open");
  expect(requests).toHaveLength(6);
  await chat("再次准备取消");
  expect(requests).toHaveLength(8);
  expect(assistantReplySchema.parse(await (await chat("confirm")).json()).text).toContain("已取消");
  expect(db.select().from(tasks).get()?.status).toBe("cancelled");
  expect(requests).toHaveLength(8);
});
