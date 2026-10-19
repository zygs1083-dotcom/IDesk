import { labels } from "@idesk/shared/labels";
import { RELAY_KINDS } from "@idesk/shared/relay";
import { useEffect, useRef, useState } from "react";
import { Button } from "../../components/button.tsx";
import { PixelIcon } from "../../components/pixel-icon.tsx";
import { Segmented } from "../../components/segmented.tsx";
import { useLang } from "../../i18n/lang.tsx";

export function RelayFilters({
  recipient,
  onRecipient,
  kind,
  onKind,
  task,
  onTask,
}: {
  recipient: string;
  onRecipient: (value: string) => void;
  kind: string;
  onKind: (value: string) => void;
  task: string;
  onTask: (value: string) => void;
}) {
  const { lang, t } = useLang();
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!open) return;
    root.current
      ?.querySelector<HTMLButtonElement>("[data-ui='relay-filter-panel'] button")
      ?.focus();
    const outside = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    };
    const onEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        trigger.current?.focus();
      }
    };
    document.addEventListener("pointerdown", outside);
    document.addEventListener("keydown", onEscape);
    return () => {
      document.removeEventListener("pointerdown", outside);
      document.removeEventListener("keydown", onEscape);
    };
  }, [open]);
  const filters = [
    {
      label: t("relay.recipient"),
      value: recipient,
      name:
        recipient === "human"
          ? t("relay.human")
          : recipient === "agent"
            ? t("relay.specific")
            : recipient === "capability"
              ? t("common.capabilities")
              : t("common.everyone"),
      clear: () => onRecipient("all"),
    },
    {
      label: t("relay.kind"),
      value: kind,
      name: kind === "all" ? "" : labels(lang).relayKind[kind as (typeof RELAY_KINDS)[number]],
      clear: () => onKind("all"),
    },
    {
      label: t("relay.relatedTask"),
      value: task,
      name: task === "with" ? t("relay.withTask") : t("relay.withoutTask"),
      clear: () => onTask("all"),
    },
  ].filter((filter) => filter.value !== "all");
  return (
    <div data-ui="relay-filters" className="flex flex-wrap items-center gap-4 whitespace-nowrap">
      <div ref={root} data-ui="relay-filter-popover" className="pixel-only">
        <Button
          ref={trigger}
          aria-expanded={open}
          aria-haspopup="dialog"
          onClick={() => setOpen(!open)}
        >
          <PixelIcon name="filter" />
          {lang === "zh" ? "筛选" : "Filter"}
        </Button>
        {open && (
          <div
            data-ui="relay-filter-panel"
            role="dialog"
            aria-label={lang === "zh" ? "筛选" : "Filter"}
          >
            <Segmented
              formField
              label={t("relay.recipient")}
              value={recipient}
              onChange={onRecipient}
              options={[
                { value: "all", label: t("common.all") },
                { value: "human", label: t("relay.human") },
                { value: "agent", label: t("relay.specific") },
                { value: "capability", label: t("common.capabilities") },
                { value: "broadcast", label: t("common.everyone") },
              ]}
            />
            <Segmented
              formField
              label={t("relay.kind")}
              value={kind}
              onChange={onKind}
              options={[
                { value: "all", label: t("relay.allKinds") },
                ...RELAY_KINDS.map((value) => ({ value, label: labels(lang).relayKind[value] })),
              ]}
            />
            <Segmented
              formField
              label={t("relay.relatedTask")}
              value={task}
              onChange={onTask}
              options={[
                { value: "all", label: t("relay.allTasks") },
                { value: "with", label: t("relay.withTask") },
                { value: "without", label: t("relay.withoutTask") },
              ]}
            />
          </div>
        )}
      </div>
      {filters.length > 0 && (
        <div data-ui="relay-filter-chips" className="pixel-only">
          {filters.map((filter) => (
            <Button
              key={filter.label}
              variant="ghost"
              onClick={filter.clear}
              aria-label={`${filter.label}: ${filter.name} · ${lang === "zh" ? "清除" : "Clear"}`}
            >
              {filter.label}: {filter.name}
              <PixelIcon name="close" />
            </Button>
          ))}
        </div>
      )}
      <div className="pixel-legacy flex flex-wrap items-center gap-4">
        <Segmented
          label={t("relay.recipient")}
          value={recipient}
          onChange={onRecipient}
          options={[
            { value: "all", label: t("common.all") },
            { value: "human", label: t("relay.human") },
            { value: "agent", label: t("relay.specific") },
            { value: "capability", label: t("common.capabilities") },
            { value: "broadcast", label: t("common.everyone") },
          ]}
        />
        <Segmented
          label={t("relay.kind")}
          value={kind}
          onChange={onKind}
          options={[
            { value: "all", label: t("relay.allKinds") },
            ...RELAY_KINDS.map((value) => ({ value, label: labels(lang).relayKind[value] })),
          ]}
        />
        <Segmented
          label={t("relay.relatedTask")}
          value={task}
          onChange={onTask}
          options={[
            { value: "all", label: t("relay.allTasks") },
            { value: "with", label: t("relay.withTask") },
            { value: "without", label: t("relay.withoutTask") },
          ]}
        />
      </div>
    </div>
  );
}
