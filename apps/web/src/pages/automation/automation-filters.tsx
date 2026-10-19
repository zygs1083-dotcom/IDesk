import { Search } from "lucide-react";
import { Button } from "../../components/button.tsx";
import { PixelIcon } from "../../components/pixel-icon.tsx";
import { Segmented } from "../../components/segmented.tsx";
import { useLang } from "../../i18n/lang.tsx";
import type { RunRange } from "./filter-runs.ts";

export function AutomationFilters({
  connectors,
  selected,
  onSelect,
  search,
  onSearch,
  range,
  onRange,
  hiddenCount,
  showHidden,
  onShowHidden,
}: {
  connectors: { id: string; name: string }[];
  selected: string;
  onSelect: (id: string) => void;
  search: string;
  onSearch: (value: string) => void;
  range: RunRange;
  onRange: (value: RunRange) => void;
  hiddenCount: number;
  showHidden: boolean;
  onShowHidden: () => void;
}) {
  const { t } = useLang();
  return (
    <div data-ui="automation-toolbar" className="flex flex-wrap items-center justify-between gap-2">
      <div data-ui="automation-connectors" className="flex min-w-0 overflow-x-auto">
        <Segmented
          label={t("common.connectors")}
          options={connectors.map((item) => ({ value: item.id, label: item.name }))}
          value={selected}
          onChange={onSelect}
        />
      </div>
      <div data-ui="automation-filter-options" className="flex flex-wrap items-center gap-2">
        <div data-ui="automation-range">
          <Segmented
            label={t("automation.range")}
            options={[
              { value: "today", label: t("automation.today") },
              { value: "all", label: t("automation.all") },
            ]}
            value={range}
            onChange={onRange}
          />
        </div>
        {hiddenCount > 0 && (
          <Button
            variant="ghost"
            data-ui="automation-hidden-toggle"
            aria-pressed={showHidden}
            onClick={onShowHidden}
            className="min-h-0 p-0 text-secondary text-text-2 hover:text-text"
          >
            {t("automation.hidden", { count: hiddenCount })}
          </Button>
        )}
        <label
          data-ui="search-field"
          className="flex min-w-0 flex-1 sidebar:max-w-60 items-center gap-2 rounded-control border border-line bg-surface px-3 py-2 text-text-2"
        >
          <PixelIcon name="search" fallback={<Search size={16} strokeWidth={1.5} />} />
          <input
            aria-label={t("automation.search")}
            placeholder={t("automation.search")}
            value={search}
            onChange={(event) => onSearch(event.target.value)}
            className="min-w-0 w-full bg-transparent text-secondary text-text outline-none placeholder:text-text-3 focus-visible:outline-1 focus-visible:outline-accent"
          />
        </label>
      </div>
    </div>
  );
}
