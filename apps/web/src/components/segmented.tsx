import { cn } from "../lib/cn.ts";

export function Segmented<T extends string>({
  label,
  options,
  value,
  onChange,
  formField = false,
}: {
  label: string;
  options: readonly { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
  formField?: boolean;
}) {
  const control = (
    <fieldset
      data-ui="segmented"
      aria-label={label}
      className="flex max-w-full gap-1 overflow-x-auto rounded-control border border-line bg-surface-2 p-1"
    >
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          aria-pressed={value === option.value}
          onClick={() => onChange(option.value)}
          className={cn(
            "flex-1 whitespace-nowrap rounded-control px-3 py-1 text-secondary transition-colors duration-hover ease-hover focus-visible:outline-2 focus-visible:outline-accent",
            value === option.value ? "bg-surface text-accent" : "text-text-2 hover:text-text",
          )}
        >
          {option.label}
        </button>
      ))}
    </fieldset>
  );
  return formField ? (
    <div data-ui="segmented-field">
      <span data-ui="field-label" className="pixel-only">
        {label}
      </span>
      {control}
    </div>
  ) : (
    control
  );
}
