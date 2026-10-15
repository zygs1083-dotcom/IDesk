import { type ReactNode, useEffect, useRef } from "react";
import { useLang } from "../i18n/lang.tsx";
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
  const { t } = useLang();
  const panel = useRef<HTMLElement>(null);
  useEffect(() => {
    const previous = document.activeElement;
    panel.current?.querySelector<HTMLButtonElement>("button")?.focus();
    const keyboard = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", keyboard);
    return () => {
      window.removeEventListener("keydown", keyboard);
      if (previous instanceof HTMLElement) previous.focus();
    };
  }, [onClose]);
  return (
    <aside ref={panel} className="pixel-panel detail-panel" role="dialog" aria-label={title}>
      <header className="panel-header">
        <h2>{title}</h2>
        <PixelButton onClick={onClose} aria-label={t("common.closePanel")}>
          ×
        </PixelButton>
      </header>
      <div className="panel-content">{children}</div>
    </aside>
  );
}
