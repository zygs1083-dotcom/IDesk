import type { ComponentPropsWithRef } from "react";
import { cn } from "../lib/cn.ts";

export function Button({
  variant = "secondary",
  className,
  ...props
}: ComponentPropsWithRef<"button"> & {
  variant?: "primary" | "secondary" | "ghost" | "danger" | "icon";
}) {
  return (
    <button
      type="button"
      data-ui="button"
      data-variant={variant}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-control px-3 py-2 text-body transition-colors duration-hover ease-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:opacity-40",
        variant === "primary"
          ? "bg-accent text-on-accent hover:bg-accent/90"
          : variant === "danger"
            ? "bg-danger-fill text-white hover:bg-danger-fill/90"
            : variant === "ghost" || variant === "icon"
              ? "hover:bg-surface-2"
              : "border border-line bg-surface hover:bg-surface-2",
        className,
      )}
      {...props}
    />
  );
}

export function IconButton({
  title,
  ...props
}: ComponentPropsWithRef<"button"> & { title: string }) {
  return <Button variant="icon" aria-label={title} title={title} {...props} />;
}
