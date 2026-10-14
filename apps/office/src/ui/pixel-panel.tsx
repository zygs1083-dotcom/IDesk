import { type ReactNode, useEffect, useRef } from "react";
import { PixelButton } from "./pixel-button.tsx";

export function PixelPanel({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  const panel = useRef<HTMLElement>(null);
  useEffect(() => {
    const previous = document.activeElement;
    panel.current?.querySelector<HTMLButtonElement>("button")?.focus();
    const keyboard = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
      if (event.key !== "Tab") return;
      const controls = panel.current?.querySelectorAll<HTMLElement>("button, a[href]");
      if (!controls?.length) return;
      const first = controls[0];
      const last = controls[controls.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last?.focus();
      }
      if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first?.focus();
      }
    };
    window.addEventListener("keydown", keyboard);
    return () => {
      window.removeEventListener("keydown", keyboard);
      if (previous instanceof HTMLElement) previous.focus();
    };
  }, [onClose]);
  return (
    <aside
      ref={panel}
      className="pixel-panel detail-panel"
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <header className="panel-header">
        <h2>{title}</h2>
        <PixelButton onClick={onClose} aria-label="关闭面板">
          ×
        </PixelButton>
      </header>
      <div className="panel-content">{children}</div>
    </aside>
  );
}
