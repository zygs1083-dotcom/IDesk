import { QueryClient } from "@tanstack/react-query";
import { afterEach, expect, test, vi } from "vitest";
import { logout } from "./logout.ts";
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
vi.mock("../i18n/lang.tsx", () => ({ currentLang: () => "en" }));
class Socket {
  static current: Socket;
  onopen: (() => void) | null = null;
  onclose: (() => void) | null = null;
  onmessage: (() => void) | null = null;
  close = vi.fn(() => this.onclose?.());
  constructor() {
    Socket.current = this;
  }
}
afterEach(() => {
  state.cleanup?.();
  client.clear();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

test("logout stops realtime and clears cache before navigation without touching browser preferences", async () => {
  vi.useFakeTimers();
  const assign = vi.fn(() => {
    expect(Socket.current.close).toHaveBeenCalled();
    expect(client.getQueryCache().getAll()).toHaveLength(0);
    expect(client.getMutationCache().getAll()).toHaveLength(0);
  });
  vi.stubGlobal("window", { location: { href: "https://example.test", assign } });
  vi.stubGlobal("WebSocket", Socket);
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, status: 204 }));
  const storage = { clear: vi.fn(), removeItem: vi.fn() };
  vi.stubGlobal("localStorage", storage);
  client.setQueryData(["auth", "me"], { role: "viewer" });
  useRealtime();
  const lateClose = Socket.current.onclose;
  await logout(client);
  expect(fetch).toHaveBeenCalledWith(
    "/api/v1/auth/logout",
    expect.objectContaining({ method: "POST", credentials: "include" }),
  );
  lateClose?.();
  vi.advanceTimersByTime(6000);
  expect(assign).toHaveBeenCalledWith("/login");
  expect(Socket.current.onmessage).toBeNull();
  expect(storage.clear).not.toHaveBeenCalled();
  expect(storage.removeItem).not.toHaveBeenCalled();
});

test("failed logout leaves session cache and navigation intact", async () => {
  const assign = vi.fn();
  vi.stubGlobal("window", { location: { assign } });
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({ ok: false, status: 500, json: async () => ({ error: "failed" }) }),
  );
  client.setQueryData(["auth", "me"], { role: "admin" });
  await expect(logout(client)).rejects.toThrow("failed");
  expect(client.getQueryData(["auth", "me"])).toEqual({ role: "admin" });
  expect(assign).not.toHaveBeenCalled();
});
