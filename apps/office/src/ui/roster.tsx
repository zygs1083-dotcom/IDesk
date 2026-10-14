import type { Scene, Seat } from "../scene/scene.ts";
import { RosterItem } from "./roster-item.tsx";
import type { Agent, Task } from "./use-office-data.ts";

export function Roster({
  zones,
  agents,
  tasks,
  seats,
  onSelect,
}: {
  zones: Scene["zones"];
  agents: Agent[];
  tasks: Task[];
  seats: Map<string, Seat>;
  onSelect: (id: string) => void;
}) {
  return (
    <aside className="pixel-panel roster">
      <h2>今日值班</h2>
      <div className="roster-groups">
        {zones.map((zone) => {
          const members = agents.filter((agent) => {
            const seat = seats.get(agent.id);
            return seat !== undefined && zone.seats.includes(seat);
          });
          const hosts = [...new Set(members.map((agent) => agent.host))];
          return (
            <section key={`${zone.name.x},${zone.name.y}`}>
              <h3>{hosts.join(" · ") || "暂无值班主机"}</h3>
              {members.map((agent) => (
                <RosterItem key={agent.id} agent={agent} tasks={tasks} onSelect={onSelect} />
              ))}
            </section>
          );
        })}
      </div>
    </aside>
  );
}
