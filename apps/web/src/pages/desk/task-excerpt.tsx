import { type ReactNode, useCallback, useId, useState } from "react";
import { CodeBlockCopyVisible } from "../../components/code-block.tsx";
import { useLang } from "../../i18n/lang.tsx";

export function TaskExcerpt({ children, lines }: { children: ReactNode; lines: 2 | 6 }) {
  const { t } = useLang();
  const id = useId();
  const [expanded, setExpanded] = useState(false);
  const [overflowing, setOverflowing] = useState(false);
  const measure = useCallback(
    (node: HTMLDivElement | null) => {
      if (!node) return;
      const content = node.firstElementChild as HTMLDivElement;
      const update = () => {
        const lineHeight = Number.parseFloat(getComputedStyle(node).lineHeight);
        setOverflowing(content.getBoundingClientRect().height > lineHeight * lines + 1);
      };
      update();
      const observer = new ResizeObserver(update);
      observer.observe(content);
      return () => observer.disconnect();
    },
    [lines],
  );

  return (
    <div className={lines === 6 ? "text-body" : "text-secondary"}>
      <div
        id={id}
        ref={measure}
        className="task-excerpt"
        data-lines={lines}
        data-expanded={expanded}
      >
        <CodeBlockCopyVisible value={expanded || !overflowing}>
          <div className="flow-root">{children}</div>
        </CodeBlockCopyVisible>
      </div>
      {overflowing && (
        <button
          type="button"
          aria-expanded={expanded}
          aria-controls={id}
          className="mt-1 min-h-6 text-accent text-label focus-visible:outline-accent"
          onClick={() => setExpanded(!expanded)}
        >
          {t(expanded ? "desk.collapseText" : "desk.expandText")}
        </button>
      )}
    </div>
  );
}
