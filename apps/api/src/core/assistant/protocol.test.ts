import { expect, test } from "vitest";
import { db } from "../../db/client.ts";
import {
  automationJobs,
  automationRuns,
  connectors,
  relayMessages,
  schedules,
  serverSamples,
} from "../../db/schema.ts";
import { registerAgent } from "../agents/agents.ts";
import { createServer } from "../servers/servers.ts";
import { createTask } from "../tasks/store.ts";
import { converse } from "./conversation.ts";
import { fakeModel, nativeReply, person } from "./fixture.ts";
import { sessionFor } from "./sessions.ts";

for (const protocol of ["openai-chat", "anthropic"] as const)
  test(`${protocol} performs real HTTP native tools round trips for platform queries and drafts`, async () => {
    const publisher = person();
    const task = createTask({ title: "mine fixture" }, publisher.id);
    registerAgent({
      name: "agent fixture",
      kind: "codex",
      host: "fixture-host",
      capabilities: ["code"],
    });
    const { server } = createServer("server fixture");
    db.insert(serverSamples)
      .values({
        serverId: server.id,
        ts: new Date(),
        cpu: 42,
        cores: [42],
        load1: 1,
        load5: 1,
        load15: 1,
        memUsed: 123,
        memTotal: 1024,
        swapUsed: 0,
        swapTotal: 0,
        diskUsed: 234,
        diskTotal: 2048,
        disks: [],
        netRx: 0,
        netTx: 0,
        uptime: 100,
      })
      .run();
    const connector = db
      .insert(connectors)
      .values({
        pluginId: "fake",
        name: "connector fixture",
        config: { apiKey: "fake-connector-secret" },
        lastError: "failure fake-connector-secret",
      })
      .returning()
      .get();
    const job = db
      .insert(automationJobs)
      .values({ connectorId: connector.id, externalId: "job", name: "failed workflow fixture" })
      .returning()
      .get();
    db.insert(automationRuns)
      .values({
        jobId: job.id,
        externalId: "run",
        status: "failed",
        startedAt: new Date(),
        finishedAt: new Date(),
      })
      .run();
    db.insert(schedules)
      .values({
        name: "schedule fixture",
        cron: "0 * * * *",
        action: {
          type: "http",
          url: "https://fake.invalid/secret",
          method: "POST",
          headers: { Authorization: "fake-schedule-secret" },
        },
      })
      .run();
    db.insert(relayMessages)
      .values({
        fromAgentId: "agent",
        to: { kind: "human" },
        kind: "request",
        subject: "inbox fixture",
      })
      .run();
    const calls = [
      { name: "list_tasks", input: { mine: true, limit: 10 } },
      { name: "get_task", input: { id: task.id } },
      { name: "list_agents", input: {} },
      { name: "list_servers", input: {} },
      { name: "automation_summary", input: { failedOnly: true } },
      { name: "list_schedules", input: {} },
      { name: "human_inbox", input: {} },
      {
        name: "draft_task",
        input: { title: "new draft", body: "must confirm", capabilities: ["code"] },
      },
    ];
    const requests = await fakeModel(
      (_request, turn) => nativeReply(protocol, turn === 1 ? calls : []),
      protocol,
    );
    const reply = await converse(
      { channel: "web", chatId: publisher.id, personId: publisher.id },
      "查询平台并准备草稿",
    );
    expect(requests).toHaveLength(2);
    expect(requests.map((request) => request.path)).toEqual([
      protocol === "anthropic" ? "/v1/messages" : "/chat/completions",
      protocol === "anthropic" ? "/v1/messages" : "/chat/completions",
    ]);
    expect(requests[0]?.headers[protocol === "anthropic" ? "x-api-key" : "authorization"]).toBe(
      protocol === "anthropic" ? "fake-model-key" : "Bearer fake-model-key",
    );
    const wire = JSON.stringify(requests[1]?.body.messages);
    for (const value of [
      "mine fixture",
      "agent fixture",
      "fixture-host",
      "server fixture",
      "42",
      "failed workflow fixture",
      "schedule fixture",
      "inbox fixture",
      "confirmationRequired",
    ])
      expect(wire).toContain(value);
    for (const secret of [
      "fake-connector-secret",
      "fake-schedule-secret",
      "https://fake.invalid/secret",
      "apiKeyHash",
      "tokenHash",
    ])
      expect(wire).not.toContain(secret);
    expect(reply.options?.map((option) => option.id)).toEqual([
      "1",
      "2",
      "3",
      "4",
      "publish",
      "cancel",
    ]);
    const session = sessionFor("web", publisher.id, publisher.id);
    expect(session.draft).toMatchObject({ kind: "task", task: { priority: "normal" } });
    expect(JSON.stringify(session.history)).not.toContain("tool_result");
    expect(JSON.stringify(session.history)).not.toContain("failed workflow fixture");
  });
