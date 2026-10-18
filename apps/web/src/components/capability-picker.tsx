import { capabilitySchema } from "@idesk/shared/capabilities";
import { X } from "lucide-react";
import { useEffect, useId, useState } from "react";
import { useLang } from "../i18n/lang.tsx";
import type { Agent } from "../lib/types.ts";
import { Button } from "./button.tsx";
import { CapabilityList } from "./capability-list.tsx";
import { CapabilityName } from "./capability-name.tsx";
import {
  addCapability,
  availablePresets,
  capabilityOptions,
  visibleCapabilities,
} from "./capability-options.ts";
import { PixelIcon } from "./pixel-icon.tsx";

export function CapabilityPicker({
  value,
  onChange,
  agents,
  mode,
  label,
  description,
  presetShortcuts = false,
}: {
  value: string[];
  onChange: (value: string[]) => void;
  agents: Agent[];
  mode: "multi" | "single";
  label: string;
  description?: string;
  presetShortcuts?: boolean;
}) {
  const { lang, t } = useLang();
  const id = useId();
  const [input, setInput] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [error, setError] = useState(false);
  const options = visibleCapabilities(capabilityOptions(agents, lang), value, input);
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
    onChange(addCapability(value, result.data, mode));
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
              <CapabilityName value={item} />
              <Button
                aria-label={t("capability.remove", { value: item })}
                className="border-0 bg-transparent p-1"
                onClick={() => onChange(value.filter((entry) => entry !== item))}
              >
                <PixelIcon name="close" fallback={<X size={16} strokeWidth={1.5} />} />
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
        onClick={() => setOpen(true)}
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
        <CapabilityList
          id={id}
          label={label}
          options={options}
          active={active}
          custom={custom}
          customValue={parsed.success ? parsed.data : input}
          input={input}
          add={add}
        />
      )}
      {presetShortcuts && (
        <fieldset aria-label={t("capability.presets")} className="flex min-w-0 flex-wrap gap-2">
          {availablePresets(value).map((preset) => (
            <Button
              key={preset.value}
              className="rounded-tag px-2 py-1 text-label"
              onClick={() => add(preset.value)}
            >
              <CapabilityName value={preset.value} />
            </Button>
          ))}
        </fieldset>
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
