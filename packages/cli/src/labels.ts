export function formatTime(iso: string): string {
  const date = new Date(iso);
  const [month, day, hour, minute] = [
    date.getMonth() + 1,
    date.getDate(),
    date.getHours(),
    date.getMinutes(),
  ].map((value) => String(value).padStart(2, "0"));
  return `${month}-${day} ${hour}:${minute}`;
}

export function formatAgentName(
  id: string | null,
  agents: { id: string; name: string; host: string }[],
): string {
  if (id === null) return "—";
  if (id === "human") return "人";
  const agent = agents.find((agent) => agent.id === id);
  return agent === undefined ? id.slice(0, 8) : `${agent.name}@${agent.host}`;
}
