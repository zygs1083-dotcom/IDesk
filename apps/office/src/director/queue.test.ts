import { expect, test, vi } from "vitest";
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

test("only the final queued action returns home, and drain waits for it", async () => {
  const log: string[] = [];
  let seated = () => {};
  const home = new Promise<void>((resolve) => {
    seated = resolve;
  });
  const queue = new ActionQueue(async (id) => {
    log.push(`${id}:home`);
    await home;
    log.push(`${id}:seated`);
  });
  void queue.enqueue("a", () => {
    log.push("claim");
  });
  void queue.enqueue("a", () => {
    log.push("complete");
  });
  const drained = queue.drain();
  await vi.waitFor(() => expect(log).toEqual(["claim", "complete", "a:home"]));
  seated();
  await drained;
  expect(log).toEqual(["claim", "complete", "a:home", "a:seated"]);
});
