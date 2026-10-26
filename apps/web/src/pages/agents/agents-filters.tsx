import { AGENT_KIND_LABELS, AGENT_KINDS } from "@idesk/shared/agent-schemas";
import { Search, X } from "lucide-react";
import { useRef } from "react";
import { Button } from "../../components/button.tsx";
import { PixelIcon } from "../../components/pixel-icon.tsx";
import { useLang } from "../../i18n/lang.tsx";
import "./agents-filters.css";

export function AgentsFilters({
  kind,
  onKind,
  search,
  onSearch,
  onClearSearch,
}: {
  kind: string;
  onKind: (value: string) => void;
  search: string;
  onSearch: (value: string) => void;
  onClearSearch: () => void;
}) {
  const { t } = useLang();
  const input = useRef<HTMLInputElement>(null);
  return (
    <div data-ui="agents-toolbar" className="flex min-w-0 w-full flex-wrap items-center gap-2">
      <label className="flex shrink-0 items-center gap-2 text-secondary text-text-2">
        {t("common.type")}
        <select
          className="rounded-control border border-line bg-surface-2 px-3 py-2 text-body text-text"
          value={kind}
          onChange={(event) => onKind(event.target.value)}
        >
          <option value="">{t("common.all")}</option>
          {AGENT_KINDS.map((value) => (
            <option key={value} value={value}>
              {AGENT_KIND_LABELS[value]}
            </option>
          ))}
        </select>
      </label>
      <div
        data-ui="search-field"
        className="relative flex min-w-0 flex-1 basis-48 items-center gap-2 rounded-control border border-line bg-surface px-3 py-2 text-text-2 md:max-w-60"
      >
        <PixelIcon
          name="search"
          fallback={<Search size={16} strokeWidth={1.5} />}
          className="shrink-0"
        />
        <input
          ref={input}
          aria-label={t("agents.searchLabel")}
          title={t("agents.searchLabel")}
          placeholder={t("agents.search")}
          value={search}
          onChange={(event) => onSearch(event.target.value)}
          className="min-w-0 w-full bg-transparent pr-6 text-secondary text-text outline-none placeholder:text-text-3 focus-visible:outline-1 focus-visible:outline-accent"
        />
        {search !== "" && (
          <Button
            variant="icon"
            className="agents-clear-search absolute right-2 size-6 min-h-0 p-0"
            aria-label={t("agents.clearSearch")}
            title={t("agents.clearSearch")}
            onClick={() => {
              onClearSearch();
              input.current?.focus();
            }}
          >
            <PixelIcon name="close" fallback={<X size={16} strokeWidth={1.5} />} />
          </Button>
        )}
      </div>
    </div>
  );
}
