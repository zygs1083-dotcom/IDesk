import { afterEach, expect, test, vi } from "vitest";
import { eventPull } from "../director/events.ts";
import { onRealtimeEvent } from "./realtime.ts";

class Socket {
  static instances: Socket[] = [];
  onopen: (() => Promise<void>) | null = null;
  onclose: (() => void) | null = null;
  onmessage: ((message: { data: string }) => void) | null = null;
  close = vi.fn(() => this.onclose?.());
  constructor() {
    Socket.instances.push(this);
  }
}
afterEach(() => {
  Socket.instances = [];
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

test("reconnect pulls missed events, preserves build reload and removes old director subscriptions", async () => {
  vi.useFakeTimers();
  vi.stubGlobal("window", { location: { href: "https://example.test" } });
  vi.stubGlobal("WebSocket", Socket);
  const reload = vi.fn();
  vi.stubGlobal("location", { reload });
  const fetchBuild = vi.fn().mockResolvedValue({ json: async () => ({ build: "first" }) });
  vi.stubGlobal("fetch", fetchBuild);
  const request = vi.fn().mockResolvedValue([]);
  const pull = eventPull("cursor", request, vi.fn());
  const oldDirector = vi.fn();
  const offOld = onRealtimeEvent(oldDirector, oldDirector);
  const off = onRealtimeEvent(
    () => void pull(),
    () => void pull(),
  );
  await Socket.instances[0]?.onopen?.();
  await pull();
  request.mockClear();
  offOld();
  oldDirector.mockClear();
  Socket.instances[0]?.onclose?.();
  vi.advanceTimersByTime(3000);
  await Socket.instances[1]?.onopen?.();
  await Promise.resolve();
  expect(request).toHaveBeenCalledWith("cursor");
  expect(oldDirector).not.toHaveBeenCalled();
  fetchBuild.mockResolvedValue({ json: async () => ({ build: "second" }) });
  await Socket.instances[1]?.onopen?.();
  expect(reload).toHaveBeenCalledOnce();
  const lateClose = Socket.instances[1]?.onclose;
  lateClose?.();
  off();
  lateClose?.();
  vi.advanceTimersByTime(10_000);
  expect(Socket.instances).toHaveLength(2);
  expect(Socket.instances[1]?.close).toHaveBeenCalledOnce();
});
