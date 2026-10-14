import type { Scene, Seat } from "./scene.ts";

export function assignSeats(
  agents: { id: string; host: string }[],
  scene: Scene,
): Map<string, Seat> {
  const hosts = [...new Set(agents.map((agent) => agent.host))].filter(
    (host) => scene.hostZones?.[host] === undefined,
  );
  const occupied = scene.zones.map(() => 0);
  const assignments = new Map<string, Seat>();
  for (const agent of agents) {
    const fixed = scene.hostZones?.[agent.host];
    const preferred =
      fixed === undefined ? hosts.indexOf(agent.host) % scene.zones.length : fixed - 1;
    for (let offset = 0; offset < scene.zones.length; offset++) {
      const zone = (preferred + offset) % scene.zones.length;
      const seat = scene.zones[zone]!.seats[occupied[zone]!];
      if (seat) {
        assignments.set(agent.id, seat);
        occupied[zone]!++;
        break;
      }
    }
  }
  return assignments;
}
