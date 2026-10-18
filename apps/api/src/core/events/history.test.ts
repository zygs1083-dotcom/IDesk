import { eventSchema } from "@idesk/shared/task-schemas";
import { expect, test } from "vitest";
import { z } from "zod";
import { app } from "../../http/app.ts";
import { emitEvent } from "./bus.ts";
import { listEvents } from "./query.ts";

test("history filters before limiting, paginates without overlap, and keeps full task timelines", async () => {
  const login = await app.request("/api/v1/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ password: "test" }),
  });
  const headers = { Cookie: login.headers.get("Set-Cookie")?.split(";")[0] as string };
  const expected = Array.from({ length: 205 }, () =>
    emitEvent({ type: "task.history", agentId: "history-agent", taskId: "history-task" }),
  );
  for (let i = 0; i < 205; i++) emitEvent({ type: "relay.history" });
  emitEvent({ type: "taskish.history", agentId: "history-agent" });
  emitEvent({ type: "task", agentId: "history-agent" });
  emitEvent({ type: "task.history", agentId: "other-agent" });
  const collected: string[] = [];
  for (let page = 0; page < 3; page++) {
    const params = new URLSearchParams({
      typePrefix: "task",
      agentId: "history-agent",
      limit: "100",
    });
    if (collected.length) params.set("before", collected.at(-1) as string);
    const response = await app.request(`/api/v1/events?${params}`, { headers });
    expect(response.status).toBe(200);
    const events = z.array(eventSchema).parse(await response.json());
    expect(events).toHaveLength(page === 2 ? 5 : 100);
    collected.push(...events.map((event) => event.id));
  }
  expect(collected).toEqual(expected.map((event) => event.id).reverse());
  expect(listEvents({ taskId: "history-task" }).map((event) => event.id)).toEqual(
    expected.map((event) => event.id),
  );
  expect(listEvents({ typePrefix: "task%", limit: 1 })).toEqual([]);
  const exact = await app.request(
    "/api/v1/events?type=task.history&agentId=history-agent&limit=1",
    { headers },
  );
  expect(z.array(eventSchema).parse(await exact.json())[0]?.id).toBe(expected.at(-1)?.id);
  for (const query of ["since=a&before=b", "limit=0", "limit=201", "limit=1.5", "limit=abc"]) {
    expect((await app.request(`/api/v1/events?${query}`, { headers })).status).toBe(400);
  }
});
