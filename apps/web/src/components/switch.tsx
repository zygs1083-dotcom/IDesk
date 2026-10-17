import { cn } from "../lib/cn.ts";

export function Switch({
  checked,
  onChange,
  label,
  disabled = false,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative inline-flex h-6 w-10 shrink-0 items-center rounded-full p-1 transition-colors duration-hover ease-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:opacity-40",
        checked ? "bg-accent" : "bg-line",
      )}
    >
      <span
        className={cn(
          "size-4 rounded-full transition-transform duration-hover ease-hover",
          checked ? "translate-x-4 bg-on-accent" : "translate-x-0 bg-white",
        )}
      />
    </button>
  );
}
