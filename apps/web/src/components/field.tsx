import { type InputHTMLAttributes, type TextareaHTMLAttributes, useId } from "react";
import { cn } from "../lib/cn.ts";

type Props = { label: string; error?: string; className?: string } & (
  | ({ multiline?: false } & InputHTMLAttributes<HTMLInputElement>)
  | ({ multiline: true } & TextareaHTMLAttributes<HTMLTextAreaElement>)
);

export function Field(props: Props) {
  const id = useId();
  const { label, error, className, multiline, ...input } = props;
  const classes = cn(
    "w-full rounded-control border border-line bg-surface-2 px-3 py-2 text-body outline-none placeholder:text-text-3 focus:border-accent",
    className,
  );
  return (
    <div className="space-y-2">
      <label htmlFor={id} className="block text-secondary text-text-2">
        {label}
      </label>
      {multiline ? (
        <textarea
          {...(input as TextareaHTMLAttributes<HTMLTextAreaElement>)}
          id={id}
          className={classes}
          aria-invalid={!!error}
          aria-describedby={error ? `${id}-error` : undefined}
        />
      ) : (
        <input
          {...(input as InputHTMLAttributes<HTMLInputElement>)}
          id={id}
          className={classes}
          aria-invalid={!!error}
          aria-describedby={error ? `${id}-error` : undefined}
        />
      )}
      {error && (
        <p id={`${id}-error`} role="alert" className="text-secondary text-status-failed">
          {error}
        </p>
      )}
    </div>
  );
}
