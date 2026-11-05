import { SERVER_RANGES } from "@idesk/shared/server-schemas";
import { Segmented } from "../../components/segmented.tsx";
import { useLang } from "../../i18n/lang.tsx";
import type { Server, ServerRange } from "../../lib/use-servers.ts";

/** 工具栏里「总览」在 URL 与 localStorage 中的取值 */
export const OVERVIEW = "overview";

export function ServerToolbar({
  servers,
  selected,
  range,
  onSelect,
}: {
  servers: Server[];
  selected: string;
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
          value={selected}
          onChange={(event) => onSelect(event.target.value, range)}
        >
          <option value={OVERVIEW}>{t("servers.overview")}</option>
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
          <button
            type="button"
            aria-pressed={selected === OVERVIEW}
            onClick={() => onSelect(OVERVIEW, range)}
            className={`whitespace-nowrap rounded-control px-3 py-1 text-secondary ${selected === OVERVIEW ? "bg-surface text-accent" : "text-text-2 hover:text-text"}`}
          >
            {t("servers.overview")}
          </button>
          {servers.map((entry) => (
            <button
              key={entry.id}
              type="button"
              aria-pressed={entry.id === selected}
              onClick={() => onSelect(entry.id, range)}
              className={`flex items-center gap-1.5 whitespace-nowrap rounded-control px-3 py-1 text-secondary ${entry.id === selected ? "bg-surface text-accent" : "text-text-2 hover:text-text"}`}
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
        onChange={(value) => onSelect(selected, value)}
      />
    </div>
  );
}
