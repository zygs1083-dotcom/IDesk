import { useLang } from "../i18n/lang.tsx";
import type { Key } from "../i18n/zh.ts";

export function PanelHandle({
  expanded,
  controls,
  collapseLabel,
  expandLabel,
  direction,
  onClick,
}: {
  expanded: boolean;
  controls: string;
  collapseLabel: Key;
  expandLabel: Key;
  direction: "top" | "left" | "right";
  onClick: () => void;
}) {
  const { t } = useLang();
  return (
    <button
      type="button"
      className={`panel-handle panel-handle-${direction}`}
      aria-label={t(expanded ? collapseLabel : expandLabel)}
      aria-expanded={expanded}
      aria-controls={controls}
      onClick={onClick}
    >
      <span aria-hidden="true">
        {direction === "top"
          ? expanded
            ? "▲"
            : "▼"
          : direction === "left"
            ? expanded
              ? "◀"
              : "▶"
            : expanded
              ? "▶"
              : "◀"}
      </span>
    </button>
  );
}
