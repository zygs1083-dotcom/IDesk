import { Ellipsis } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { useEffect, useId, useRef, useState } from "react";
import { cn } from "../lib/cn.ts";
import { Button } from "./button.tsx";
import { PixelIcon } from "./pixel-icon.tsx";

export function Menu({
  label,
  items,
  disabled = false,
  trigger,
}: {
  label: string;
  items: { label: string; onSelect: () => void; danger?: boolean }[];
  disabled?: boolean;
  trigger?: string;
}) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menu = useRef<HTMLDivElement>(null);
  const id = useId();
  const reduced = useReducedMotion();
  useEffect(() => {
    if (!open) return;
    menu.current?.querySelector("button")?.focus();
    const outside = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", outside);
    return () => document.removeEventListener("pointerdown", outside);
  }, [open]);
  function close() {
    setOpen(false);
    triggerRef.current?.focus();
  }
  return (
    <div ref={root} className="relative">
      <Button
        ref={triggerRef}
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? id : undefined}
        disabled={disabled}
        variant={trigger ? "ghost" : "icon"}
        title={label}
        className={trigger ? "border-0 text-accent" : "border-0 p-2"}
        onClick={() => setOpen(!open)}
        onKeyDown={(event) => {
          if (event.key === "ArrowDown" || event.key === "ArrowUp") {
            event.preventDefault();
            setOpen(true);
          }
        }}
      >
        {trigger ?? <PixelIcon name="more" fallback={<Ellipsis size={18} strokeWidth={1.5} />} />}
      </Button>
      {open && (
        <motion.div
          id={id}
          ref={menu}
          role="menu"
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              event.preventDefault();
              close();
            }
            if (event.key === "Tab") setOpen(false);
            if (["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) {
              event.preventDefault();
              const buttons = Array.from(menu.current?.querySelectorAll("button") ?? []);
              const current = buttons.indexOf(document.activeElement as HTMLButtonElement);
              const index =
                event.key === "Home"
                  ? 0
                  : event.key === "End"
                    ? buttons.length - 1
                    : (current + (event.key === "ArrowDown" ? 1 : -1) + buttons.length) %
                      buttons.length;
              buttons[index]?.focus();
            }
          }}
          aria-label={label}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: reduced ? 0 : 0.2 }}
          className="absolute right-0 top-full z-20 min-w-36 rounded-pop border border-line bg-surface p-1 shadow-pop"
        >
          {items.map((item) => (
            <button
              key={item.label}
              type="button"
              role="menuitem"
              tabIndex={-1}
              className={cn(
                "block w-full rounded-control px-3 py-2 text-left text-secondary hover:bg-line focus:bg-line focus:outline-none",
                item.danger ? "text-status-failed" : "text-text",
              )}
              onClick={() => {
                close();
                item.onSelect();
              }}
            >
              {item.label}
            </button>
          ))}
        </motion.div>
      )}
    </div>
  );
}
