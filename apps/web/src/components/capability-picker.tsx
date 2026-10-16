import { capabilitySchema } from "@idesk/shared/capabilities";
import { X } from "lucide-react";
import { useEffect, useId, useState } from "react";
import { useLang } from "../i18n/lang.tsx";
import { cn } from "../lib/cn.ts";
import type { Agent } from "../lib/types.ts";
import { Button } from "./button.tsx";
import { capabilityOptions } from "./capability-options.ts";

export function CapabilityPicker({
  value,
  onChange,
  agents,
  mode,
  label,
  description,
}: {
  value: string[];
  onChange: (value: string[]) => void;
  agents: Agent[];
  mode: "multi" | "single";
  label: string;
  description?: string;
}) {
  const { lang, t } = useLang();
  const id = useId();
  const [input, setInput] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [error, setError] = useState(false);
  const options = capabilityOptions(agents, lang).filter(
    (option) =>
      !value.includes(option.value) &&
      `${option.label} ${option.value}`.toLowerCase().includes(input.trim().toLowerCase()),
  );
  const parsed = capabilitySchema.safeParse(input);
  const custom =
    input.trim().length > 0 &&
    !options.some((option) => option.value === (parsed.success ? parsed.data : input));
  const count = options.length + Number(custom);
  useEffect(() => {
    if (open && active >= 0)
      document.getElementById(`${id}-option-${active}`)?.scrollIntoView({ block: "nearest" });
  }, [active, id, open]);
  function add(raw: string) {
    const result = capabilitySchema.safeParse(raw);
    if (!result.success) {
      setError(true);
      return;
    }
    onChange(mode === "single" ? [result.data] : [...new Set([...value, result.data])]);
    setInput("");
    setError(false);
    setActive(-1);
    setOpen(false);
  }
  return (
    <div className="space-y-2">
      <label htmlFor={id} className="block text-secondary text-text-2">
        {label}
      </label>
      {value.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {value.map((item) => (
            <span
              key={item}
              className="inline-flex max-w-full items-center gap-1 rounded-tag border border-line bg-surface-2 pl-2 text-label"
            >
              <span className="break-all">{item}</span>
              <Button
                aria-label={t("capability.remove", { value: item })}
                className="border-0 bg-transparent p-1"
                onClick={() => onChange(value.filter((entry) => entry !== item))}
              >
                <X size={14} strokeWidth={1.5} />
              </Button>
            </span>
          ))}
        </div>
      )}
      <input
        id={id}
        role="combobox"
        aria-expanded={open}
        aria-controls={`${id}-options`}
        aria-autocomplete="list"
        aria-activedescendant={open && active >= 0 ? `${id}-option-${active}` : undefined}
        aria-invalid={error}
        aria-describedby={error ? `${id}-error` : description ? `${id}-description` : undefined}
        className="w-full rounded-control border border-line bg-surface-2 px-3 py-2 text-body outline-none placeholder:text-text-3 focus:border-accent"
        value={input}
        placeholder={t("capability.placeholder")}
        onBlur={() => setOpen(false)}
        onFocus={() => setOpen(true)}
        onChange={(event) => {
          setInput(event.target.value);
          setOpen(true);
          setActive(-1);
          setError(false);
        }}
        onKeyDown={(event) => {
          if (event.key === "ArrowDown" || event.key === "ArrowUp") {
            event.preventDefault();
            setOpen(true);
            setActive(
              count === 0
                ? -1
                : ((active < 0 ? (event.key === "ArrowDown" ? -1 : 0) : active) +
                    (event.key === "ArrowDown" ? 1 : count - 1)) %
                    count,
            );
          }
          if (event.key === "Escape" && open) {
            event.preventDefault();
            event.stopPropagation();
            setOpen(false);
          }
          if (event.key === "Enter") {
            event.preventDefault();
            const option = open && active >= 0 ? options[active] : undefined;
            if (option || input.length > 0) add(option?.value ?? input);
          }
        }}
      />
      {open && (
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
                <span className="min-w-0 break-words">
                  {option.label}
                  <span className="ml-2 text-label text-text-2">{option.value}</span>
                </span>
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
                {t("capability.add", { value: parsed.success ? parsed.data : input })}
              </button>
            </div>
          )}
          {count === 0 && (
            <p className="px-3 py-2 text-secondary text-text-2">{t("capability.empty")}</p>
          )}
        </div>
      )}
      {description && (
        <p id={`${id}-description`} className="text-secondary text-text-2">
          {description}
        </p>
      )}
      {error && (
        <p id={`${id}-error`} role="alert" className="text-secondary text-status-failed">
          {t("capability.invalid")}
        </p>
      )}
    </div>
  );
}
