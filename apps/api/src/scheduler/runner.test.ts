import { afterEach, expect, test, vi } from "vitest";

const { expireLeases, pollDueConnectors } = vi.hoisted(() => ({
  expireLeases: vi.fn(),
  pollDueConnectors: vi.fn(),
}));
vi.mock("../core/tasks/lease.ts", () => ({ expireLeases }));
vi.mock("../plugins/poll.ts", () => ({ pollDueConnectors }));

import { startScheduler } from "./runner.ts";

afterEach(() => {
  vi.useRealTimers();
  vi.clearAllMocks();
});
test("a pending poll does not block minute lease expiration and polling remains protected", async () => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-10-18T12:00:00Z"));
  let finish!: () => void;
  pollDueConnectors.mockImplementation(
    () =>
      new Promise<void>((resolve) => {
        finish = resolve;
      }),
  );
  const stop = startScheduler();
  await vi.advanceTimersByTimeAsync(180_000);
  expect(expireLeases).toHaveBeenCalledTimes(3);
  expect(pollDueConnectors).toHaveBeenCalledTimes(1);
  finish();
  await Promise.resolve();
  stop();
  await vi.advanceTimersByTimeAsync(60_000);
  expect(expireLeases).toHaveBeenCalledTimes(3);
});
