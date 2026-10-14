import { useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";

type RealtimeEvent = {
  type: string;
  taskId?: string;
  agentId?: string;
  ts: string;
};

const queryKeys: Record<string, string> = {
  task: "tasks",
  relay: "relay",
  agent: "agents",
  connector: "automation",
  schedule: "schedules",
};

export function useRealtime() {
  const queryClient = useQueryClient();

  useEffect(() => {
    let socket: WebSocket;
    let reconnectTimer: ReturnType<typeof setTimeout> | undefined;
    const url = new URL("/ws", window.location.href);
    url.protocol = url.protocol === "https:" ? "wss:" : "ws:";

    function connect() {
      socket = new WebSocket(url);
      socket.onmessage = (message) => {
        const event: RealtimeEvent = JSON.parse(message.data);
        const prefix = event.type.slice(0, event.type.indexOf("."));
        const queryKey = queryKeys[prefix];
        if (queryKey) void queryClient.invalidateQueries({ queryKey: [queryKey] });
        if (prefix === "task" && event.taskId) {
          void queryClient.invalidateQueries({ queryKey: ["task", event.taskId] });
        }
        void queryClient.invalidateQueries({ queryKey: ["events"] });
      };
      socket.onclose = () => {
        reconnectTimer = setTimeout(connect, 3000);
      };
    }

    connect();
    return () => {
      clearTimeout(reconnectTimer);
      socket.onclose = null;
      socket.close();
    };
  }, [queryClient]);
}
