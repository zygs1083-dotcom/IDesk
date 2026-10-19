import { useEffect, useRef, useState } from "react";
import { Button, IconButton } from "../../components/button.tsx";
import { PixelIcon } from "../../components/pixel-icon.tsx";
import { useLang } from "../../i18n/lang.tsx";
import { copyText } from "../../lib/clipboard.ts";

export function AccessRow({
  title,
  value,
  description,
  openUrl,
}: {
  title: string;
  value: string;
  description?: string;
  openUrl?: string;
}) {
  const { t } = useLang();
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);
  async function copy() {
    try {
      await copyText(value);
      setError("");
      setCopied(true);
      clearTimeout(timer.current);
      timer.current = setTimeout(() => setCopied(false), 2000);
    } catch {
      setError(t("settings.copyFailed"));
    }
  }
  return (
    <div className="flex items-start gap-4 border-b border-line p-4 last:border-b-0">
      <div className="min-w-0 flex-1 space-y-2">
        <p className="text-secondary text-text-2">{title}</p>
        <code className="block select-text break-all text-secondary">{value}</code>
        {description && <p className="text-secondary text-text-2">{description}</p>}
        {error && (
          <p role="alert" className="text-secondary text-status-failed">
            {error}
          </p>
        )}
      </div>
      {openUrl && (
        <a
          href={openUrl}
          target="_blank"
          rel="noreferrer"
          className="shrink-0 py-2 text-secondary text-accent hover:underline"
        >
          {t("settings.open")}
        </a>
      )}
      <span className="pixel-legacy">
        <Button aria-label={t("settings.copyNamed", { title })} onClick={copy}>
          {copied ? t("common.copied") : t("common.copy")}
        </Button>
      </span>
      <span className="pixel-only">
        <IconButton
          title={copied ? t("common.copied") : t("settings.copyNamed", { title })}
          onClick={copy}
        >
          <PixelIcon name={copied ? "check" : "copy"} />
        </IconButton>
      </span>
    </div>
  );
}
