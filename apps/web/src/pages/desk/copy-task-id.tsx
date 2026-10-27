import { Check, Copy } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button } from "../../components/button.tsx";
import { PixelIcon } from "../../components/pixel-icon.tsx";
import { useLang } from "../../i18n/lang.tsx";
import { copyText } from "../../lib/clipboard.ts";

export function CopyTaskId({
  taskId,
  onError,
}: {
  taskId: string;
  onError: ((message: string) => void) | undefined;
}) {
  const { t } = useLang();
  const [status, setStatus] = useState<"idle" | "pending" | "copied">("idle");
  const active = useRef(true);
  useEffect(() => {
    active.current = true;
    return () => {
      active.current = false;
    };
  }, []);

  async function copy() {
    setStatus("pending");
    try {
      await copyText(taskId);
      if (active.current) setStatus("copied");
    } catch {
      if (!active.current) return;
      setStatus("idle");
      onError?.(t("desk.copyFailed"));
    }
  }

  return (
    <Button
      variant="icon"
      className="size-8 shrink-0 p-0 text-secondary"
      aria-label={t("desk.copyTaskId")}
      title={t("desk.copyTaskId")}
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
  );
}
