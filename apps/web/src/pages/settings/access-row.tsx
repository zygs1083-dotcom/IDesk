import { useEffect, useRef, useState } from "react";
import { Button } from "../../components/button.tsx";
import { useLang } from "../../i18n/lang.tsx";

export function AccessRow({
  title,
  value,
  description,
}: {
  title: string;
  value: string;
  description?: string;
}) {
  const { t } = useLang();
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);
  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
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
      <Button aria-label={t("settings.copy", { p1: title })} onClick={copy}>
        {copied ? t("settings.copied") : t("settings.copy2")}
      </Button>
    </div>
  );
}
