import { ExternalLink } from "lucide-react";
import type { ReactNode } from "react";
import { PixelIcon } from "../../components/pixel-icon.tsx";
import { useLang } from "../../i18n/lang.tsx";
import { cn } from "../../lib/cn.ts";

export function CardHeading({
  name,
  group,
  url,
  status,
  color,
  actions,
}: {
  name: string;
  group: string | null;
  url: string | null;
  status: string;
  color: string;
  actions?: ReactNode;
}) {
  const { t } = useLang();
  return (
    <>
      <div className="mb-2 flex items-start gap-2">
        <span
          data-ui="status-dot"
          title={status}
          className={cn("mt-1.5 size-2 shrink-0 rounded-full", color)}
        />
        <h3
          data-ui="card-title"
          title={name}
          className="min-w-0 flex-1 line-clamp-2 wrap-anywhere text-body"
        >
          {name}
        </h3>
        {actions}
        {url !== null && (
          <a
            href={url}
            target="_blank"
            rel="noreferrer"
            aria-label={t("automation.openRun", { name })}
            title={t("automation.openRun", { name })}
            data-ui="automation-external"
            className="shrink-0 rounded-control text-text-2 hover:text-text focus-visible:outline-2 focus-visible:outline-accent"
          >
            <PixelIcon name="external" fallback={<ExternalLink size={16} strokeWidth={1.5} />} />
          </a>
        )}
      </div>
      {group !== null && group !== name && (
        <p
          data-ui="card-group"
          title={group}
          className="mb-0 line-clamp-1 wrap-anywhere text-label text-text-2"
        >
          {group}
        </p>
      )}
    </>
  );
}
