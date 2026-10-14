import { useEffect } from "react";

export function useRealtime() {
  useEffect(() => {
    let socket: WebSocket;
    let reconnectTimer: ReturnType<typeof setTimeout> | undefined;
    const url = new URL("/ws", window.location.href);
    url.protocol = url.protocol === "https:" ? "wss:" : "ws:";

    function connect() {
      socket = new WebSocket(url);
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
  }, []);
}
