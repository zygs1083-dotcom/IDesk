export type RealtimeEvent = { type: string; taskId?: string; agentId?: string; ts: string };

type Subscription = { event: (event: RealtimeEvent) => void; ready?: () => void };
const listeners = new Set<Subscription>();
let socket: WebSocket | undefined;
let reconnectTimer: ReturnType<typeof setTimeout> | undefined;
let build: string | null | undefined;

async function serverBuild() {
  const response = await fetch("/api/meta");
  return ((await response.json()) as { build: string | null }).build;
}

function connect() {
  const url = new URL("/ws", window.location.href);
  url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
  const connection = new WebSocket(url);
  socket = connection;
  connection.onmessage = (message) => {
    if (socket !== connection) return;
    const event: RealtimeEvent = JSON.parse(message.data);
    for (const listener of listeners) listener.event(event);
  };
  connection.onopen = async () => {
    if (socket !== connection) return;
    for (const listener of listeners) listener.ready?.();
    const current = await serverBuild();
    if (socket !== connection) return;
    if (build === undefined) build = current;
    else if (current !== build) location.reload();
  };
  connection.onclose = () => {
    if (socket === connection && listeners.size > 0) reconnectTimer = setTimeout(connect, 3000);
  };
}

export function onRealtimeEvent(
  event: (event: RealtimeEvent) => void,
  ready?: () => void,
): () => void {
  const subscription: Subscription = { event, ...(ready ? { ready } : {}) };
  listeners.add(subscription);
  if (!socket) connect();
  return () => {
    listeners.delete(subscription);
    if (listeners.size > 0) return;
    clearTimeout(reconnectTimer);
    if (socket) {
      socket.onopen = null;
      socket.onmessage = null;
      socket.onclose = null;
      socket.close();
      socket = undefined;
    }
  };
}
