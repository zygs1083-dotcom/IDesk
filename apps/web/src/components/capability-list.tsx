import { useLang } from "../i18n/lang.tsx";
import { cn } from "../lib/cn.ts";
import { CapabilityName } from "./capability-name.tsx";
import type { capabilityOptions } from "./capability-options.ts";

export function CapabilityList({
  id,
  label,
  options,
  active,
  custom,
  customValue,
  input,
  add,
}: {
  id: string;
  label: string;
  options: ReturnType<typeof capabilityOptions>;
  active: number;
  custom: boolean;
  customValue: string;
  input: string;
  add: (value: string) => void;
}) {
  const { t } = useLang();
  const count = options.length + Number(custom);
  return (
    <div
      id={`${id}-options`}
      role="listbox"
      aria-label={label}
      className="max-h-40 overflow-auto rounded-control border border-line bg-surface"
    >
      {options.map((option, index) => (
        <div
          key={option.value}
          id={`${id}-option-${index}`}
          role="option"
          tabIndex={-1}
          aria-selected={active === index}
        >
          <button
            type="button"
            tabIndex={-1}
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => add(option.value)}
            className={cn(
              "flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-secondary hover:bg-surface-2",
              active === index && "bg-surface-2",
            )}
          >
            <CapabilityName value={option.value} />
            <span className="shrink-0 text-label tabular-nums text-text-2">
              {t("capability.count", { online: option.online, total: option.total })}
            </span>
          </button>
        </div>
      ))}
      {custom && (
        <div
          id={`${id}-option-${options.length}`}
          role="option"
          tabIndex={-1}
          aria-selected={active === options.length}
        >
          <button
            type="button"
            tabIndex={-1}
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => add(input)}
            className={cn(
              "w-full break-all px-3 py-2 text-left text-secondary text-accent hover:bg-surface-2",
              active === options.length && "bg-surface-2",
            )}
          >
            {t("capability.add", { value: customValue })}
          </button>
        </div>
      )}
      {count === 0 && (
        <p className="px-3 py-2 text-secondary text-text-2">{t("capability.empty")}</p>
      )}
    </div>
  );
}
