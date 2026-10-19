import { SERVER_RANGES } from "@idesk/shared/server-schemas";
import { Segmented } from "../../components/segmented.tsx";
import { useLang } from "../../i18n/lang.tsx";
import type { Server, ServerRange } from "../../lib/use-servers.ts";

export function ServerToolbar({
  servers,
  server,
  range,
  onSelect,
}: {
  servers: Server[];
  server: Server;
  range: ServerRange;
  onSelect: (serverId: string, range: ServerRange) => void;
}) {
  const { t } = useLang();
  const ranges = SERVER_RANGES.map((value) => ({
    value,
    label: t(
      value === "1h"
        ? "servers.range1h"
        : value === "6h"
          ? "servers.range6h"
          : value === "24h"
            ? "servers.range24h"
            : "servers.range7d",
    ),
  }));
  return (
    <div data-ui="server-toolbar" className="flex flex-wrap items-center justify-between gap-3">
      {servers.length > 6 ? (
        <select
          aria-label={t("servers.select")}
          className="min-w-0 max-w-full rounded-control border border-line bg-surface px-3 py-2 text-secondary"
          value={server.id}
          onChange={(event) => onSelect(event.target.value, range)}
        >
          {servers.map((entry) => (
            <option key={entry.id} value={entry.id}>
              {entry.status === "online" ? "●" : "○"} {entry.name}
            </option>
          ))}
        </select>
      ) : (
        <fieldset
          data-ui="segmented"
          aria-label={t("servers.select")}
          className="flex max-w-full flex-wrap gap-1 rounded-control border border-line bg-surface-2 p-1"
        >
          {servers.map((entry) => (
            <button
              key={entry.id}
              type="button"
              aria-pressed={entry.id === server.id}
              onClick={() => onSelect(entry.id, range)}
              className={`flex items-center gap-1.5 whitespace-nowrap rounded-control px-3 py-1 text-secondary ${entry.id === server.id ? "bg-surface text-accent" : "text-text-2 hover:text-text"}`}
            >
              <span data-ui="server-status-dot" data-status={entry.status} aria-hidden="true" />
              <span className="sr-only">
                {t(entry.status === "online" ? "common.online" : "common.offline")}
              </span>
              {entry.name}
            </button>
          ))}
        </fieldset>
      )}
      <Segmented
        label={t("servers.range")}
        options={ranges}
        value={range}
        onChange={(value) => onSelect(server.id, value)}
      />
    </div>
  );
}
