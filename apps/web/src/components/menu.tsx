import { Ellipsis } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { useId, useLayoutEffect, useRef, useState } from "react";
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
  useLayoutEffect(() => {
    if (!open) return;
    if (disabled) {
      setOpen(false);
      return;
    }
    const panel = menu.current;
    const button = triggerRef.current;
    if (!panel || !button) return;
    const anchor = button.getBoundingClientRect();
    // Keep the DOM ancestry (including modal dialogs) while escaping scroll clipping.
    panel.showPopover();
    const bounds = panel.getBoundingClientRect();
    const above = Math.max(0, anchor.top - 8);
    const below = Math.max(0, window.innerHeight - anchor.bottom - 8);
    const upwards = bounds.height > below && above > below;
    panel.style.maxHeight = `${upwards ? above : below}px`;
    panel.style.left = `${Math.max(8, Math.min(anchor.right - bounds.width, window.innerWidth - bounds.width - 8))}px`;
    panel.style.top = `${upwards ? anchor.top - Math.min(bounds.height, above) : anchor.bottom}px`;
    panel.querySelector("button")?.focus({ preventScroll: true });
    const outside = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    };
    const moved = (event: Event) => {
      if (event.type === "scroll" && panel.contains(event.target as Node)) return;
      setOpen(false);
      triggerRef.current?.focus({ preventScroll: true });
    };
    document.addEventListener("pointerdown", outside);
    document.addEventListener("scroll", moved, true);
    window.addEventListener("resize", moved);
    return () => {
      document.removeEventListener("pointerdown", outside);
      document.removeEventListener("scroll", moved, true);
      window.removeEventListener("resize", moved);
      panel.hidePopover();
    };
  }, [open, disabled]);
  function close() {
    setOpen(false);
    triggerRef.current?.focus({ preventScroll: true });
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
          popover="manual"
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              event.preventDefault();
              event.stopPropagation();
              close();
            }
            if (event.key === "Tab") close();
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
          className="fixed inset-auto m-0 w-min min-w-36 max-w-[calc(100vw-16px)] overflow-y-auto rounded-pop border border-line bg-surface p-1 shadow-pop"
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
