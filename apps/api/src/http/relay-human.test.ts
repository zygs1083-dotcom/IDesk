import { relayMessageSchema, relaySummarySchema } from "@idesk/shared/relay-schemas";
import { expect, test } from "vitest";
import { z } from "zod";
import { config } from "../config.ts";
import { registerAgent } from "../core/agents/agents.ts";
import { listEvents } from "../core/events/query.ts";
import { app } from "./app.ts";

async function session(password: string) {
  const response = await app.request("/api/v1/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ password }),
  });
  expect(response.status).toBe(200);
  return { Cookie: (response.headers.get("Set-Cookie") as string).split(";")[0] as string };
}
test("human inbox, inferred replies, visibility, receipts and counts", async () => {
  const sender = registerAgent({
    name: "human sender",
    kind: "codex",
    host: "test",
    capabilities: [],
  });
  const other = registerAgent({ name: "outsider", kind: "codex", host: "test", capabilities: [] });
  const admin = await session("test");
  const auth = { Authorization: `Bearer ${sender.apiKey}` };
  const outsider = { Authorization: `Bearer ${other.apiKey}` };
  const get = (path: string, headers: Record<string, string> = admin) =>
    app.request(`/api/v1/relay${path}`, { headers });
  const post = (path: string, body: object, headers: Record<string, string> = auth) =>
    app.request(`/api/v1/relay${path}`, {
      method: "POST",
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  const before = relaySummarySchema.parse(await (await get("/summary")).json());
  const sent = await post("", { to: { kind: "human" }, kind: "request", subject: "Need decision" });
  expect(sent.status).toBe(201);
  const message = relayMessageSchema.parse(await sent.json());
  expect((await post("", { kind: "note", subject: "Missing recipient" })).status).toBe(400);
  const self = await post("", { to: { kind: "human" }, kind: "note", subject: "Self" }, admin);
  expect(self.status).toBe(400);
  expect(await self.text()).toContain("不能发给自己");
  for (const suffix of ["", "/thread"]) {
    expect((await get(`/${message.id}${suffix}`, outsider)).status).toBe(404);
    expect((await get(`/${message.id}${suffix}`, auth)).status).toBe(200);
  }
  const ids = async (path: string, headers: Record<string, string> = admin) =>
    z
      .array(relayMessageSchema)
      .parse(await (await get(path, headers)).json())
      .map((m) => m.id);
  expect(await ids("?box=all", outsider)).not.toContain(message.id);
  expect(await ids("?box=sent", auth)).toContain(message.id);
  expect(await ids("")).toContain(message.id);
  expect(await ids("?box=sent")).not.toContain(message.id);
  expect(await ids("?box=all&toKind=human")).toContain(message.id);
  expect(relaySummarySchema.parse(await (await get("/summary")).json())).toEqual({
    unread: before.unread + 1,
    pendingRequests: before.pendingRequests + 1,
  });
  const read = await post(`/${message.id}/read`, {}, admin);
  expect(read.status).toBe(200);
  expect(relayMessageSchema.parse(await read.json()).readBy).toEqual(["human"]);
  expect((await post(`/${message.id}/read`, {}, admin)).status).toBe(200);
  expect(
    listEvents({ type: "relay.read" }).filter((event) => event.payload.messageId === message.id),
  ).toEqual([
    expect.objectContaining({ agentId: null, payload: { messageId: message.id, reader: "human" } }),
  ]);
  const reply = relayMessageSchema.parse(
    await (
      await post("", { replyTo: message.id, kind: "reply", subject: "Approved" }, admin)
    ).json(),
  );
  expect(reply.to).toEqual({ kind: "agent", id: sender.agent.id });
  expect(await ids("?box=sent")).toContain(reply.id);
  expect(await ids("?box=all&toKind=human")).not.toContain(reply.id);
  expect(await ids("?box=all")).toEqual(expect.arrayContaining([reply.id, message.id]));
  expect((await post(`/${reply.id}/read`, {}, admin)).status).toBe(403);
  expect(await (await post(`/${reply.id}/read`, {}, admin)).text()).toContain(
    "只能标记发给人的消息",
  );
  expect(relaySummarySchema.parse(await (await get("/summary")).json())).toEqual(before);
  const followup = relayMessageSchema.parse(
    await (await post("", { replyTo: reply.id, kind: "reply", subject: "Acknowledged" })).json(),
  );
  expect(followup.to).toEqual({ kind: "human" });
  const previous = config.IDESK_VIEWER_PASSWORD;
  config.IDESK_VIEWER_PASSWORD = "w91-viewer";
  try {
    const viewer = await session("w91-viewer");
    expect(await (await get("/summary", viewer)).json()).toEqual(
      await (await get("/summary")).json(),
    );
    expect((await post(`/${followup.id}/read`, {}, viewer)).status).toBe(403);
  } finally {
    config.IDESK_VIEWER_PASSWORD = previous;
  }
});
