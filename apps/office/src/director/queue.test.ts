import { expect, test } from "vitest";
import { ActionQueue } from "./queue.ts";

test("one character finishes an action before starting its next action", async () => {
  const queue = new ActionQueue();
  const log: string[] = [];
  let release = () => {};
  const blocked = new Promise<void>((resolve) => {
    release = resolve;
  });
  const first = queue.enqueue("a", async () => {
    log.push("walk");
    await blocked;
    log.push("sit");
  });
  const second = queue.enqueue("a", () => {
    log.push("report");
  });
  await Promise.resolve();
  expect(log).toEqual(["walk"]);
  release();
  await Promise.all([first, second]);
  expect(log).toEqual(["walk", "sit", "report"]);
});

test("a blocked character does not block another character", async () => {
  const queue = new ActionQueue();
  let release = () => {};
  const blocked = new Promise<void>((resolve) => {
    release = resolve;
  });
  const first = queue.enqueue("a", () => blocked);
  let reported = false;
  await queue.enqueue("b", () => {
    reported = true;
  });
  expect(reported).toBe(true);
  release();
  await first;
});
