import { ExternalLink } from "lucide-react";
import { useLang } from "../../i18n/lang.tsx";
import { cn } from "../../lib/cn.ts";

export function CardHeading({
  name,
  group,
  url,
  status,
  color,
}: {
  name: string;
  group: string | null;
  url: string | null;
  status: string;
  color: string;
}) {
  const { t } = useLang();
  return (
    <>
      <div className="mb-2 flex items-start gap-2">
        <span title={status} className={cn("mt-1.5 size-2 shrink-0 rounded-full", color)} />
        <h3 className="min-w-0 flex-1 line-clamp-2 text-body">{name}</h3>
        {url !== null && (
          <a
            href={url}
            target="_blank"
            rel="noreferrer"
            aria-label={t("automation.openRun", { name })}
            className="shrink-0 rounded-control text-text-2 hover:text-text focus-visible:outline-2 focus-visible:outline-accent"
          >
            <ExternalLink size={16} strokeWidth={1.5} />
          </a>
        )}
      </div>
      {group !== null && (
        <p title={group} className="mb-2 truncate text-label text-text-2">
          {group}
        </p>
      )}
    </>
  );
}
