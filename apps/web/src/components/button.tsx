import type { ComponentPropsWithRef } from "react";
import { cn } from "../lib/cn.ts";

export function Button({
  variant = "secondary",
  className,
  ...props
}: ComponentPropsWithRef<"button"> & { variant?: "primary" | "secondary" }) {
  return (
    <button
      type="button"
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-control px-3 py-2 text-body transition-colors duration-hover ease-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:opacity-40",
        variant === "primary"
          ? "bg-accent text-white hover:bg-accent/90"
          : "border border-line bg-surface hover:bg-surface-2",
        className,
      )}
      {...props}
    />
  );
}
