import { Check, Link } from "lucide-react";
import { useState } from "react";
import { Button } from "../../components/button.tsx";
import { PixelIcon } from "../../components/pixel-icon.tsx";
import { useLang } from "../../i18n/lang.tsx";
import { copyText } from "../../lib/clipboard.ts";
import type { Task } from "../../lib/types.ts";

export function CopyTaskLink({
  task,
  onError,
}: {
  task: Task;
  onError: (message: string) => void;
}) {
  const { t } = useLang();
  const [copied, setCopied] = useState(false);
  async function copy() {
    setCopied(false);
    try {
      await copyText(`${location.origin}/desk?${new URLSearchParams({ task: task.id })}`);
      setCopied(true);
    } catch {
      setCopied(false);
      onError(t("desk.copyFailed"));
    }
  }

  return (
    <Button
      variant="icon"
      className="size-8 shrink-0 p-0 text-secondary"
      aria-label={t("desk.copyTaskLink")}
      title={t("desk.copyTaskLink")}
      onClick={copy}
    >
      {copied ? (
        <PixelIcon name="check" fallback={<Check size={18} strokeWidth={1.5} />} />
      ) : (
        <PixelIcon name="external" fallback={<Link size={18} strokeWidth={1.5} />} />
      )}
      <span className="sr-only" aria-live="polite">
        {copied ? t("common.copied") : ""}
      </span>
    </Button>
  );
}
