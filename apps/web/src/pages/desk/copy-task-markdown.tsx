import { useState } from "react";
import { Button } from "../../components/button.tsx";
import { useLang } from "../../i18n/lang.tsx";
import { copyText } from "../../lib/clipboard.ts";
import type { Task } from "../../lib/types.ts";
import { taskMarkdown } from "./task-markdown.ts";

export function CopyTaskMarkdown({
  task,
  onError,
}: {
  task: Task;
  onError: (message: string) => void;
}) {
  const { lang, t } = useLang();
  const [copied, setCopied] = useState(false);
  async function copy() {
    setCopied(false);
    try {
      await copyText(taskMarkdown(task, lang, location.origin));
      setCopied(true);
    } catch {
      setCopied(false);
      onError(t("desk.copyFailed"));
    }
  }

  return (
    <Button
      variant="ghost"
      className="min-w-0 max-w-full px-2 py-1 text-secondary"
      aria-label={t("desk.copyAsMarkdown")}
      aria-live="polite"
      onClick={copy}
    >
      <span className="min-w-0 whitespace-normal">
        {t(copied ? "common.copied" : "desk.copyAsMarkdown")}
      </span>
    </Button>
  );
}
