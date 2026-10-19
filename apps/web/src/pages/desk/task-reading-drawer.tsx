import { type ReactNode, useCallback, useId, useState } from "react";
import { Drawer } from "../../components/drawer.tsx";
import { useLang } from "../../i18n/lang.tsx";

export function TaskReadingDrawer({
  title,
  onClose,
  footer,
  children,
}: {
  title: string;
  onClose: () => void;
  footer: ReactNode;
  children: ReactNode;
}) {
  const { t } = useLang();
  const id = useId();
  const [overflowing, setOverflowing] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const measure = useCallback((node: HTMLSpanElement | null) => {
    if (!node) return;
    const content = node.firstElementChild as HTMLSpanElement;
    const update = () => {
      const overflow = content.getBoundingClientRect().height > node.clientHeight + 1;
      setOverflowing(overflow);
      if (!overflow) setExpanded(false);
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(content);
    observer.observe(node);
    return () => observer.disconnect();
  }, []);
  const revealTitle = useCallback(
    (node: HTMLDivElement | null) => {
      if (node && expanded) (node.parentElement as HTMLDivElement).scrollTop = 0;
    },
    [expanded],
  );

  return (
    <Drawer
      open
      onClose={onClose}
      footer={footer}
      title={
        // biome-ignore lint/a11y/useSemanticElements: h2 accepts phrasing content, so fieldset is invalid here.
        <span role="group" aria-label={title}>
          <span ref={measure} className="task-title-preview" aria-hidden={overflowing}>
            <span className="block">{title}</span>
          </span>
          {overflowing && (
            <button
              type="button"
              aria-expanded={expanded}
              aria-controls={id}
              className="mt-1 block min-h-6 text-accent text-label focus-visible:outline-accent"
              onClick={() => setExpanded(!expanded)}
            >
              {t(expanded ? "desk.collapseTitle" : "desk.expandTitle")}
            </button>
          )}
        </span>
      }
    >
      {overflowing && (
        <div id={id} ref={revealTitle} hidden={!expanded}>
          {expanded && (
            <p className="task-full-title mb-4 border-b border-line pb-4 text-body">{title}</p>
          )}
        </div>
      )}
      {children}
    </Drawer>
  );
}
