import { Search, X } from "lucide-react";
import { useRef } from "react";
import { useLocation, useNavigate } from "react-router";
import { Button } from "../../components/button.tsx";
import { PixelIcon } from "../../components/pixel-icon.tsx";
import { useLang } from "../../i18n/lang.tsx";
import { parseEnabledFilter } from "./enabled-filter.ts";
import "./schedules-search.css";

export function SchedulesSearch({ params }: { params: URLSearchParams }) {
  const { t } = useLang();
  const input = useRef<HTMLInputElement>(null);
  const location = useLocation();
  const navigate = useNavigate();
  const search = params.get("q") ?? "";
  const enabled = parseEnabledFilter(params);
  function setEnabled(value: string) {
    if (value === enabled) return;
    const next = new URLSearchParams(params);
    if (value) next.set("enabled", value);
    else next.delete("enabled");
    navigate(
      { pathname: location.pathname, search: next.toString(), hash: location.hash },
      { preventScrollReset: true },
    );
  }
  function setSearch(value: string, replace = false) {
    if (value === search) return;
    const next = new URLSearchParams(params);
    if (value) next.set("q", value);
    else next.delete("q");
    navigate(
      { pathname: location.pathname, search: next.toString(), hash: location.hash },
      { replace, preventScrollReset: true },
    );
  }
  return (
    <div data-ui="schedules-toolbar" className="flex min-w-0 w-full items-center gap-2">
      <div
        data-ui="search-field"
        className="relative flex min-w-0 flex-1 items-center gap-2 rounded-control border border-line bg-surface px-3 py-2 text-text-2 md:max-w-60"
      >
        <PixelIcon
          name="search"
          fallback={<Search size={16} strokeWidth={1.5} />}
          className="shrink-0"
        />
        <input
          ref={input}
          aria-label={t("schedules.searchLabel")}
          title={t("schedules.searchLabel")}
          placeholder={t("schedules.search")}
          value={search}
          onChange={(event) => setSearch(event.target.value, true)}
          className="min-w-0 w-full bg-transparent pr-6 text-secondary text-text outline-none placeholder:text-text-3 focus-visible:outline-1 focus-visible:outline-accent"
        />
        {search !== "" && (
          <Button
            type="button"
            variant="icon"
            className="schedules-clear-search absolute right-2 size-6 min-h-0 p-0"
            aria-label={t("schedules.clearSearch")}
            title={t("schedules.clearSearch")}
            onClick={() => {
              setSearch("");
              input.current?.focus();
            }}
          >
            <PixelIcon name="close" fallback={<X size={16} strokeWidth={1.5} />} />
          </Button>
        )}
      </div>
      <select
        aria-label={t("schedules.enabledState")}
        title={t("schedules.enabledState")}
        value={enabled}
        onChange={(event) => setEnabled(event.target.value)}
        className="h-9 shrink-0 rounded-control border border-line bg-surface px-3 text-secondary text-text"
      >
        <option value="">{t("common.all")}</option>
        <option value="true">{t("schedules.enabled")}</option>
        <option value="false">{t("schedules.disabled")}</option>
      </select>
    </div>
  );
}
