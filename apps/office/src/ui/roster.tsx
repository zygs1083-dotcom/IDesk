import type { OfficeLayout as Layout } from "@idesk/shared/office-layout";
import { useLang } from "../i18n/lang.tsx";
import type { Seat } from "../world/places.ts";
import { RosterItem } from "./roster-item.tsx";
import type { Agent, Task } from "./use-office-data.ts";

export function Roster({
  zones,
  agents,
  tasks,
  seats,
  standing,
  onSelect,
}: {
  zones: Layout["zones"];
  agents: Agent[];
  tasks: Task[];
  seats: Map<string, Pick<Seat, "id" | "x" | "y" | "facing" | "zone">>;
  standing?: Map<string, Pick<Seat, "id" | "x" | "y" | "facing" | "zone">>;
  onSelect: (id: string) => void;
}) {
  const { t } = useLang();
  return (
    <aside className="pixel-panel roster">
      <h2>{t("roster.duty")}</h2>
      <div className="roster-groups">
        {zones.map((zone) => {
          const members = agents.filter((agent) => {
            const seat = seats.get(agent.id);
            return seat !== undefined && seat.zone === zone.id;
          });
          const hosts = [...new Set(members.map((agent) => agent.host))];
          return (
            <section key={zone.id}>
              <h3>{hosts.join(" · ") || t("roster.emptyHost")}</h3>
              {members.map((agent) => (
                <RosterItem key={agent.id} agent={agent} tasks={tasks} onSelect={onSelect} />
              ))}
            </section>
          );
        })}
        {standing && standing.size > 0 && (
          <section>
            <h3>{t("roster.standing")}</h3>
            {agents
              .filter((agent) => standing.has(agent.id))
              .map((agent) => (
                <RosterItem key={agent.id} agent={agent} tasks={tasks} onSelect={onSelect} />
              ))}
          </section>
        )}
      </div>
    </aside>
  );
}
