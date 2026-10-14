export type RealtimeEvent = { type: string; taskId?: string; agentId?: string; ts: string };

const listeners = new Set<(event: RealtimeEvent) => void>();
let socket: WebSocket | undefined;

function connect() {
  const url = new URL("/ws", window.location.href);
  url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
  socket = new WebSocket(url);
  socket.onmessage = (message) => {
    const event: RealtimeEvent = JSON.parse(message.data);
    for (const listener of listeners) listener(event);
  };
  socket.onclose = () => setTimeout(connect, 3000);
}

export function onRealtimeEvent(listener: (event: RealtimeEvent) => void): () => void {
  if (!socket) connect();
  listeners.add(listener);
  return () => listeners.delete(listener);
}
