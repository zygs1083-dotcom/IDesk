import { afterEach, expect, test, vi } from "vitest";

vi.hoisted(() => {
  vi.stubGlobal("window", {});
});
vi.mock("../i18n/lang.tsx", () => ({ useLang: vi.fn() }));
vi.mock("./api.ts", () => ({ request: vi.fn() }));

import { QueryClient, QueryObserver } from "@tanstack/react-query";
import { request } from "./api.ts";
import { agentsQueryOptions } from "./use-agents.ts";

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});
test("presence refreshes after 30 seconds without an event", async () => {
  vi.useFakeTimers();
  vi.mocked(request).mockResolvedValue([{ id: "agent", status: "offline" }]);
  const client = new QueryClient();
  const observer = new QueryObserver(client, agentsQueryOptions);
  const off = observer.subscribe(() => {});
  await observer.refetch();
  vi.mocked(request).mockClear();
  vi.mocked(request).mockResolvedValue([{ id: "agent", status: "online" }]);
  await vi.advanceTimersByTimeAsync(29_999);
  expect(request).not.toHaveBeenCalled();
  await vi.advanceTimersByTimeAsync(1);
  expect(request).toHaveBeenCalledOnce();
  expect(observer.getCurrentResult().data?.[0]?.status).toBe("online");
  off();
  client.clear();
});
