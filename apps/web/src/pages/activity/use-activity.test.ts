import { InfiniteQueryObserver, QueryClient } from "@tanstack/react-query";
import { expect, test, vi } from "vitest";
import { request } from "../../lib/api.ts";
import type { TaskEvent } from "../../lib/types.ts";
import { activityQueryOptions } from "./use-activity.ts";

vi.mock("../../lib/api.ts", () => ({ request: vi.fn() }));

test("history requests server filters and older pages, refetches with fresh cursors and resets filters", async () => {
  let events: TaskEvent[] = Array.from({ length: 205 }, (_, index) => ({
    id: String(1000 - index),
    type: "task.created",
    agentId: "agent",
    taskId: "task",
    ts: "2026-01-01T00:00:00Z",
    payload: {},
  }));
  const urls: URL[] = [];
  vi.mocked(request).mockImplementation(async (path) => {
    const url = new URL(path, "http://test");
    urls.push(url);
    const before = url.searchParams.get("before");
    return events.filter((event) => !before || Number(event.id) < Number(before)).slice(0, 100);
  });
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const observer = new InfiniteQueryObserver(client, activityQueryOptions("task", "agent"));
  const off = observer.subscribe(() => {});
  await observer.refetch();
  await observer.fetchNextPage();
  expect(urls.at(-1)?.searchParams.get("before")).toBe("901");
  expect(
    urls.every(
      (url) =>
        url.searchParams.get("typePrefix") === "task" &&
        url.searchParams.get("agentId") === "agent",
    ),
  ).toBe(true);
  events = [{ ...(events[0] as TaskEvent), id: "1001" }, ...events];
  await client.invalidateQueries({ queryKey: ["events"] });
  const ids = observer
    .getCurrentResult()
    .data?.pages.flat()
    .map((event) => event.id);
  expect(ids?.[0]).toBe("1001");
  expect(new Set(ids).size).toBe(ids?.length);
  await observer.fetchNextPage();
  expect(observer.getCurrentResult().hasNextPage).toBe(false);
  observer.setOptions(activityQueryOptions("relay", "other"));
  await observer.refetch();
  expect(urls.at(-1)?.searchParams.get("before")).toBeNull();
  expect(urls.at(-1)?.searchParams.get("typePrefix")).toBe("relay");
  expect(observer.getCurrentResult().data?.pages).toHaveLength(1);
  await new Promise((resolve) => setTimeout(resolve, 0));
  observer.setOptions(activityQueryOptions("task", "agent"));
  await observer.refetch();
  expect(urls.at(-1)?.searchParams.get("before")).toBeNull();
  expect(observer.getCurrentResult().data?.pages).toHaveLength(1);
  off();
  client.clear();
});
