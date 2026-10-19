import { type InputHTMLAttributes, type TextareaHTMLAttributes, useId } from "react";
import { cn } from "../lib/cn.ts";
import { PixelIcon } from "./pixel-icon.tsx";

type Props = { label: string; error?: string; className?: string } & (
  | ({ multiline?: false } & InputHTMLAttributes<HTMLInputElement>)
  | ({ multiline: true } & TextareaHTMLAttributes<HTMLTextAreaElement>)
);

export function Field(props: Props) {
  const id = useId();
  const { label, error, className, multiline, ...input } = props;
  const dateField =
    !multiline && "type" in input && (input.type === "date" || input.type === "datetime-local");
  const classes = cn(
    "w-full rounded-control border border-line bg-surface-2 px-3 py-2 text-body outline-none placeholder:text-text-3 focus:border-accent",
    className,
  );
  return (
    <div data-ui={dateField ? "date-field" : undefined} className="space-y-2">
      <label htmlFor={id} data-ui="field-label" className="block text-secondary text-text-2">
        {label}
        {input.required && (
          <span className="pixel-required" aria-hidden="true">
            {" "}
            *
          </span>
        )}
      </label>
      {multiline ? (
        <textarea
          {...(input as TextareaHTMLAttributes<HTMLTextAreaElement>)}
          data-ui="field"
          id={id}
          className={classes}
          aria-invalid={!!error}
          aria-describedby={error ? `${id}-error` : undefined}
        />
      ) : (
        <div data-ui={dateField ? "date-input-wrap" : undefined}>
          <input
            {...(input as InputHTMLAttributes<HTMLInputElement>)}
            data-ui="field"
            id={id}
            className={classes}
            aria-invalid={!!error}
            aria-describedby={error ? `${id}-error` : undefined}
          />
          {dateField && (
            <span data-ui="date-icon" className="pixel-only" aria-hidden="true">
              <PixelIcon name="schedule" />
            </span>
          )}
        </div>
      )}
      {error && (
        <p id={`${id}-error`} role="alert" className="text-secondary text-status-failed">
          {error}
        </p>
      )}
    </div>
  );
}
