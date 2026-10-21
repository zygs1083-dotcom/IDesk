import { expect, test } from "vitest";
import { z } from "zod";
import { emitEvent } from "../events/bus.ts";
import { createTask } from "../tasks/store.ts";
import { person } from "./fixture.ts";
import { sessionFor } from "./sessions.ts";
import { executeTool } from "./tools.ts";

const taskRows = z.array(z.object({ id: z.string(), title: z.string() }));
test("task tool limits default/mine/status results to ten and includes recent report payload", () => {
  const publisher = person();
  for (let i = 0; i < 14; i++) createTask({ title: `owned ${i}` }, publisher.id);
  createTask({ title: "foreign" }, "human");
  const session = sessionFor("web", publisher.id, publisher.id);
  for (const input of [{}, { mine: true }, { status: "open" }, { mine: true, limit: 3 }]) {
    const rows = taskRows.parse(
      JSON.parse(executeTool(session, { id: "list", name: "list_tasks", input })),
    );
    expect(rows).toHaveLength("limit" in input ? 3 : 10);
    if ("mine" in input) expect(rows.every((row) => row.title.startsWith("owned"))).toBe(true);
  }
  const task = createTask({ title: "report history" }, publisher.id);
  for (let i = 0; i < 12; i++)
    emitEvent({ taskId: task.id, type: "task.reported", payload: { message: `step ${i}` } });
  const result = z
    .object({
      events: z.array(z.object({ type: z.string(), payload: z.object({ message: z.string() }) })),
    })
    .parse(
      JSON.parse(executeTool(session, { id: "detail", name: "get_task", input: { id: task.id } })),
    );
  expect(result.events).toHaveLength(10);
  expect(result.events[0]?.payload.message).toBe("step 11");
  expect(result.events.at(-1)?.payload.message).toBe("step 2");
});
