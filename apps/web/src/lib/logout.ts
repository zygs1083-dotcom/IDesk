import type { QueryClient } from "@tanstack/react-query";
import { request } from "./api.ts";
import { stopRealtime } from "./use-realtime.ts";

export async function logout(client: QueryClient) {
  await request<void>("/auth/logout", { method: "POST" });
  stopRealtime(client);
  client.clear();
  window.location.assign("/login");
}
