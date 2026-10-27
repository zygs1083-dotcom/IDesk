import { Check, Copy } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button } from "../../components/button.tsx";
import { PixelIcon } from "../../components/pixel-icon.tsx";
import { useLang } from "../../i18n/lang.tsx";
import { copyText } from "../../lib/clipboard.ts";

export function CopyFailureDetails({ text }: { text: string }) {
  const { t } = useLang();
  const [status, setStatus] = useState<"idle" | "pending" | "copied" | "failed">("idle");
  const active = useRef(true);
  const pending = useRef(false);
  useEffect(() => {
    active.current = true;
    return () => {
      active.current = false;
    };
  }, []);

  async function copy() {
    if (pending.current) return;
    pending.current = true;
    setStatus("pending");
    try {
      await copyText(text);
      if (active.current) setStatus("copied");
    } catch {
      if (active.current) setStatus("failed");
    } finally {
      pending.current = false;
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between gap-2">
        <p className="flex min-w-0 items-center gap-2">
          <span aria-hidden="true" className="h-1.5 w-1.5 shrink-0 rounded-full bg-status-failed" />
          {t("common.failed")}
        </p>
        <Button
          variant="icon"
          className="relative size-8 shrink-0 p-0 text-secondary"
          aria-label={t("schedules.copyFailure")}
          title={t("schedules.copyFailure")}
          disabled={status === "pending"}
          onClick={copy}
        >
          {status === "copied" ? (
            <PixelIcon name="check" fallback={<Check size={18} strokeWidth={1.5} />} />
          ) : (
            <PixelIcon name="copy" fallback={<Copy size={18} strokeWidth={1.5} />} />
          )}
          <span className="sr-only" aria-live="polite">
            {status === "copied" ? t("common.copied") : ""}
          </span>
        </Button>
      </div>
      {status === "failed" && (
        <p role="alert" className="text-status-failed">
          {t("desk.copyFailed")}
        </p>
      )}
    </div>
  );
}
