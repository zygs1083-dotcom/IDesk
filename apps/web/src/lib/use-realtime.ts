import { type QueryClient, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";

type RealtimeEvent = {
  type: string;
  taskId?: string;
  agentId?: string;
  ts: string;
};

const queryKeys: Record<string, string[]> = {
  task: ["tasks"],
  relay: ["relay"],
  agent: ["agents"],
  person: ["people"],
  connector: ["automation", "connectors"],
  schedule: ["schedules"],
};

const subscriptions = new Map<QueryClient, () => void>();

export function stopRealtime(client: QueryClient) {
  subscriptions.get(client)?.();
}

export function useRealtime() {
  const queryClient = useQueryClient();

  useEffect(() => {
    let socket: WebSocket;
    let disposed = false;
    let reconnectTimer: ReturnType<typeof setTimeout> | undefined;
    const url = new URL("/ws", window.location.href);
    url.protocol = url.protocol === "https:" ? "wss:" : "ws:";

    function connect() {
      if (disposed) return;
      socket = new WebSocket(url);
      socket.onopen = () => {
        if (disposed) return;
        for (const key of [
          "task",
          "tasks",
          "relay",
          "agents",
          "people",
          "automation",
          "connectors",
          "schedules",
          "events",
        ])
          void queryClient.invalidateQueries({ queryKey: [key] });
      };
      socket.onmessage = (message) => {
        if (disposed) return;
        const event: RealtimeEvent = JSON.parse(message.data);
        const prefix = event.type.slice(0, event.type.indexOf("."));
        for (const queryKey of queryKeys[prefix] ?? [])
          void queryClient.invalidateQueries({ queryKey: [queryKey] });
        if (prefix === "task" && event.taskId) {
          void queryClient.invalidateQueries({ queryKey: ["task", event.taskId] });
        }
        void queryClient.invalidateQueries({ queryKey: ["events"] });
      };
      socket.onclose = () => {
        if (!disposed) reconnectTimer = setTimeout(connect, 3000);
      };
    }

    connect();
    const stop = () => {
      disposed = true;
      clearTimeout(reconnectTimer);
      socket.onopen = null;
      socket.onmessage = null;
      socket.onclose = null;
      socket.close();
      subscriptions.delete(queryClient);
    };
    subscriptions.set(queryClient, stop);
    return stop;
  }, [queryClient]);
}
