import { expect, test } from "vitest";
import { eventPull, type OfficeEvent } from "./events.ts";

const event = (id: string): OfficeEvent => ({
  id,
  ts: "2026-10-15T00:00:00Z",
  type: "task.created",
  taskId: null,
  agentId: null,
  payload: {},
});

test("simultaneous notifications share one fetch and events are handled oldest first", async () => {
  let calls = 0;
  const processed: string[] = [];
  const pull = eventPull(
    "0",
    async () => {
      calls++;
      return [event("2"), event("1")];
    },
    async (item) => {
      processed.push(item.id);
    },
  );
  await Promise.all([pull(), pull()]);
  expect(calls).toBe(1);
  expect(processed).toEqual(["1", "2"]);
});

test("a notification during a fetch schedules one more incremental fetch", async () => {
  const cursors: string[] = [];
  let finish = (_events: OfficeEvent[]) => {};
  const pending = new Promise<OfficeEvent[]>((resolve) => {
    finish = resolve;
  });
  const pull = eventPull(
    "0",
    async (since) => {
      cursors.push(since);
      return cursors.length === 1 ? pending : [];
    },
    async () => {},
  );
  const first = pull();
  await Promise.resolve();
  const second = pull();
  const third = pull();
  finish([event("2"), event("1")]);
  await Promise.all([first, second, third]);
  expect(cursors).toEqual(["0", "2"]);
});

test("a full 200 event batch continues immediately using the greatest processed id", async () => {
  const cursors: string[] = [];
  const processed: string[] = [];
  const batch = Array.from({ length: 200 }, (_, index) =>
    event(String(index + 1).padStart(3, "0")),
  );
  const pull = eventPull(
    "000",
    async (since) => {
      cursors.push(since);
      return cursors.length === 1 ? batch : [event("201")];
    },
    async (item) => {
      processed.push(item.id);
    },
  );
  await pull();
  expect(cursors).toEqual(["000", "200"]);
  expect(processed).toEqual([...batch.map((item) => item.id).sort(), "201"]);
});

test("a failed request does not swallow the next notification", async () => {
  const cursors: string[] = [];
  const processed: string[] = [];
  const pull = eventPull(
    "0",
    async (since) => {
      cursors.push(since);
      if (cursors.length === 1) throw new Error("request failed");
      return [event("1")];
    },
    async (item) => {
      processed.push(item.id);
    },
  );
  await expect(pull()).rejects.toThrow("request failed");
  await pull();
  expect(cursors).toEqual(["0", "0"]);
  expect(processed).toEqual(["1"]);
});
