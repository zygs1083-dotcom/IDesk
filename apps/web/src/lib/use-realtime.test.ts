import { QueryClient } from "@tanstack/react-query";
import { afterEach, expect, test, vi } from "vitest";
import { useRealtime } from "./use-realtime.ts";

const state = vi.hoisted(() => ({ cleanup: undefined as (() => void) | undefined }));
const client = new QueryClient();
vi.mock("react", () => ({
  useEffect: (effect: () => () => void) => {
    state.cleanup = effect();
  },
}));
vi.mock("@tanstack/react-query", async (original) => ({
  ...(await original<typeof import("@tanstack/react-query")>()),
  useQueryClient: () => client,
}));
class Socket {
  static instances: Socket[] = [];
  onopen: (() => void) | null = null;
  onclose: (() => void) | null = null;
  onmessage: ((message: { data: string }) => void) | null = null;
  close = vi.fn(() => this.onclose?.());
  constructor() {
    Socket.instances.push(this);
  }
}
afterEach(() => {
  state.cleanup?.();
  client.clear();
  Socket.instances = [];
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

test("each open invalidates all existing entities without needing an event; connector updates both views", () => {
  vi.useFakeTimers();
  vi.stubGlobal("window", { location: { href: "https://example.test" } });
  vi.stubGlobal("WebSocket", Socket);
  const keys = [
    "task",
    "tasks",
    "relay",
    "agents",
    "automation",
    "connectors",
    "schedules",
    "events",
  ];
  for (const key of keys) client.setQueryData([key, "existing"], "before");
  useRealtime();
  Socket.instances[0]?.onopen?.();
  for (const key of keys) expect(client.getQueryState([key, "existing"])?.isInvalidated).toBe(true);
  for (const key of keys) client.setQueryData([key, "existing"], "before");
  Socket.instances[0]?.onclose?.();
  vi.advanceTimersByTime(3000);
  expect(Socket.instances).toHaveLength(2);
  Socket.instances[1]?.onopen?.();
  for (const key of keys) expect(client.getQueryState([key, "existing"])?.isInvalidated).toBe(true);
  for (const key of ["automation", "connectors"]) client.setQueryData([key, "existing"], "before");
  Socket.instances[1]?.onmessage?.({ data: JSON.stringify({ type: "connector.polled" }) });
  for (const key of ["automation", "connectors"])
    expect(client.getQueryState([key, "existing"])?.isInvalidated).toBe(true);
  const lateClose = Socket.instances[1]?.onclose;
  lateClose?.();
  state.cleanup?.();
  lateClose?.();
  vi.advanceTimersByTime(10_000);
  expect(Socket.instances).toHaveLength(2);
  expect(Socket.instances[1]?.close).toHaveBeenCalled();
});

test.each(["relay.sent", "relay.read"])("%s invalidates inbox counts and lists", (type) => {
  vi.stubGlobal("window", { location: { href: "https://example.test" } });
  vi.stubGlobal("WebSocket", Socket);
  client.setQueryData(["relay", "summary"], { unread: 1, pendingRequests: 1 });
  client.setQueryData(["relay", { box: "inbox" }], []);
  useRealtime();
  Socket.instances[0]?.onmessage?.({ data: JSON.stringify({ type }) });
  expect(client.getQueryState(["relay", "summary"])?.isInvalidated).toBe(true);
  expect(client.getQueryState(["relay", { box: "inbox" }])?.isInvalidated).toBe(true);
});
