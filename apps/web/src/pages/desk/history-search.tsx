import { X } from "lucide-react";
import { useRef } from "react";
import { Button } from "../../components/button.tsx";
import { Field } from "../../components/field.tsx";
import { PixelIcon } from "../../components/pixel-icon.tsx";
import { useLang } from "../../i18n/lang.tsx";
import "./history-search.css";

export function HistorySearch({
  pixel = false,
  search,
  onSearch,
  onClear,
}: {
  pixel?: boolean;
  search: string;
  onSearch: (value: string) => void;
  onClear: () => void;
}) {
  const { t } = useLang();
  const wrapper = useRef<HTMLDivElement>(null);
  return (
    <div
      ref={wrapper}
      data-ui={pixel ? "history-search" : undefined}
      className={pixel ? "history-search relative w-60 max-w-full" : "history-search"}
    >
      {pixel && (
        <PixelIcon
          name="search"
          className="pointer-events-none absolute left-3 top-4 text-text-2"
        />
      )}
      <Field
        label={t("desk.search")}
        type={pixel ? "search" : undefined}
        placeholder={pixel ? t("desk.search") : undefined}
        value={search}
        onChange={(event) => onSearch(event.target.value)}
      />
      {search !== "" && (
        <Button
          type="button"
          variant="icon"
          className="history-clear-search"
          aria-label={t("desk.clearSearch")}
          title={t("desk.clearSearch")}
          onClick={() => {
            onClear();
            wrapper.current?.querySelector("input")?.focus();
          }}
        >
          <PixelIcon name="close" fallback={<X size={16} strokeWidth={1.5} />} />
        </Button>
      )}
    </div>
  );
}
