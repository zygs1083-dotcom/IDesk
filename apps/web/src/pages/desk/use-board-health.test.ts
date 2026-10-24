import { QueryClient, type UseQueryOptions } from "@tanstack/react-query";
import { afterEach, assert, beforeEach, expect, test, vi } from "vitest";
import type { TaskEvent } from "../../lib/types.ts";
import { detailTask } from "./task-detail.fixtures.ts";
import { useBoardHealth } from "./use-board-health.ts";

const state = vi.hoisted(() => ({
  now: undefined as number | undefined,
  cleanup: undefined as (() => void) | undefined,
  events: [] as UseQueryOptions<TaskEvent[]>[],
  relay: undefined as UseQueryOptions | undefined,
}));
const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
vi.mock("react", async (original) => ({
  ...(await original<typeof import("react")>()),
  useState: (initial: () => number) => {
    state.now ??= initial();
    return [
      state.now,
      (value: number) => {
        state.now = value;
      },
    ];
  },
  useEffect: (effect: () => () => void) => {
    state.cleanup ??= effect();
  },
}));
vi.mock("@tanstack/react-query", async (original) => ({
  ...(await original<typeof import("@tanstack/react-query")>()),
  useQueries: ({ queries }: { queries: UseQueryOptions<TaskEvent[]>[] }) => {
    state.events = queries;
    return queries.map((query) => ({
      data: client.getQueryData(query.queryKey),
      error: client.getQueryState(query.queryKey)?.error ?? null,
      isPending: !client.getQueryData(query.queryKey),
    }));
  },
  useQuery: (options: UseQueryOptions) => {
    state.relay = options;
    return {
      data: client.getQueryData(options.queryKey),
      error: client.getQueryState(options.queryKey)?.error ?? null,
      status: client.getQueryState(options.queryKey)?.status ?? "pending",
    };
  },
}));
vi.mock("../../i18n/lang.tsx", () => ({ currentLang: () => "en" }));
const now = new Date("2026-10-24T12:00:00Z").getTime();
const running = { ...detailTask, id: "running", status: "in_progress" as const };
const claim: TaskEvent = {
  id: "claim",
  taskId: running.id,
  agentId: "agent",
  type: "task.claim",
  ts: new Date(now - 15 * 60_000).toISOString(),
  payload: { from: "open", to: "in_progress" },
};
const pending = {
  id: "request",
  fromAgentId: "agent",
  taskId: running.id,
  kind: "request",
  readBy: ["human"],
};
const fetch = vi.fn();
beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(now);
  state.now = undefined;
  state.events = [];
  state.relay = undefined;
  fetch.mockReset();
  vi.stubGlobal("fetch", fetch);
});
afterEach(() => {
  state.cleanup?.();
  state.cleanup = undefined;
  client.clear();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

test("only in-scope running tasks query shared event keys and concurrent observers deduplicate the fetch", async () => {
  const outside = { ...running, id: "outside" };
  useBoardHealth([running, detailTask], [running, detailTask, outside]);
  expect(state.events.map((query) => query.queryKey)).toEqual([["task", running.id, "events"]]);
  const options = state.events[0];
  assert(options);
  fetch.mockResolvedValue({ ok: true, json: async () => [claim] });
  await Promise.all([client.query(options), client.query(options)]);
  expect(fetch).toHaveBeenCalledTimes(1);
  expect(fetch.mock.calls[0]?.[0]).toBe(`/api/v1/tasks/${running.id}/events`);
  expect(options).not.toHaveProperty("refetchInterval");
});

test("the minute refresh observes the strict threshold and a cache update clears silence immediately", () => {
  client.setQueryData(["task", running.id, "events"], [claim]);
  expect(useBoardHealth([running], [running]).health.silent.size).toBe(0);
  vi.advanceTimersByTime(59_999);
  expect(useBoardHealth([running], [running]).health.silent.size).toBe(0);
  vi.advanceTimersByTime(1);
  expect(useBoardHealth([running], [running]).health.silent.size).toBe(1);
  client.setQueryData(
    ["task", running.id, "events"],
    [
      claim,
      {
        ...claim,
        id: "report",
        type: "task.reported",
        ts: new Date(Date.now()).toISOString(),
        payload: { message: "fresh report" },
      },
    ],
  );
  expect(useBoardHealth([running], [running]).health.silent.size).toBe(0);
});

test("waiting uses the server pending-request contract, keeps read requests and drops answered requests after invalidation", async () => {
  useBoardHealth([running], [running]);
  const options = state.relay;
  assert(options);
  expect(options.queryKey[0]).toBe("relay");
  expect(options).not.toHaveProperty("refetchInterval");
  fetch.mockResolvedValueOnce({ ok: true, json: async () => [pending] });
  await client.query(options);
  expect(fetch.mock.calls[0]?.[0]).toBe(
    "/api/v1/relay?box=all&kind=request&requestStatus=pending&hasTask=true",
  );
  expect(useBoardHealth([running], [running]).health.waiting.has(running.id)).toBe(true);
  await client.invalidateQueries({ queryKey: ["relay"] });
  fetch.mockResolvedValueOnce({ ok: true, json: async () => [] });
  await client.query(options);
  expect(useBoardHealth([running], [running]).health.waiting.size).toBe(0);
});

test("the unbounded pending endpoint keeps more than one hundred linked tasks in the count", async () => {
  const scope = Array.from({ length: 105 }, (_, index) => ({
    ...running,
    id: `waiting-${index}`,
  }));
  useBoardHealth(scope, scope);
  const options = state.relay;
  assert(options);
  fetch.mockResolvedValueOnce({
    ok: true,
    json: async () =>
      scope.map((task) => ({
        ...pending,
        taskId: task.id,
      })),
  });
  await client.query(options);
  expect(useBoardHealth(scope, scope).health.waiting.size).toBe(105);
  expect(fetch.mock.calls[0]?.[0]).not.toContain("limit=");
});

test("event and relay loading stay indeterminate and real event failures reach the page error", async () => {
  let result = useBoardHealth([running], [running]);
  expect(result.status).toEqual({ silent: "pending", waiting: "pending" });
  const options = state.events[0];
  assert(options);
  fetch.mockRejectedValueOnce(new Error("Event request failed"));
  await expect(client.query(options)).rejects.toThrow("Event request failed");
  result = useBoardHealth([running], [running]);
  expect(result.status.silent).toBe("error");
  expect(result.error?.message).toBe("Event request failed");
});
