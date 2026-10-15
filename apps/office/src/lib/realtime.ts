export type RealtimeEvent = { type: string; taskId?: string; agentId?: string; ts: string };

const listeners = new Set<(event: RealtimeEvent) => void>();
let socket: WebSocket | undefined;
let build: string | null | undefined;

async function serverBuild() {
  const response = await fetch("/api/meta");
  return ((await response.json()) as { build: string | null }).build;
}

function connect() {
  const url = new URL("/ws", window.location.href);
  url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
  socket = new WebSocket(url);
  socket.onmessage = (message) => {
    const event: RealtimeEvent = JSON.parse(message.data);
    for (const listener of listeners) listener(event);
  };
  socket.onopen = async () => {
    const current = await serverBuild();
    if (build === undefined) build = current;
    else if (current !== build) location.reload();
  };
  socket.onclose = () => setTimeout(connect, 3000);
}

export function onRealtimeEvent(listener: (event: RealtimeEvent) => void): () => void {
  if (!socket) connect();
  listeners.add(listener);
  return () => listeners.delete(listener);
}
