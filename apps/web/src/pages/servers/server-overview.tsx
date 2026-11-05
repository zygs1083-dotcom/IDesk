import type { Server, ServerRange } from "../../lib/use-servers.ts";
import { useServersMetrics } from "../../lib/use-servers.ts";
import { OverviewCard } from "./overview-card.tsx";

export function ServerOverview({
  servers,
  range,
  now,
  onOpen,
}: {
  servers: Server[];
  range: ServerRange;
  now: number;
  onOpen: (serverId: string) => void;
}) {
  const metrics = useServersMetrics(
    servers.map((server) => server.id),
    range,
  );
  return (
    <div data-ui="server-overview" className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
      {servers.map((server, index) => (
        <OverviewCard
          key={server.id}
          server={server}
          metrics={metrics[index]?.data}
          range={range}
          now={now}
          onOpen={() => onOpen(server.id)}
        />
      ))}
    </div>
  );
}
