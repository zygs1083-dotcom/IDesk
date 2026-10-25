import { Check, Copy } from "lucide-react";
import { createContext, type ReactNode, useContext, useState } from "react";
import { useLang } from "../i18n/lang.tsx";
import { copyText } from "../lib/clipboard.ts";
import { Button } from "./button.tsx";
import { PixelIcon } from "./pixel-icon.tsx";

export const CodeBlockCopyVisible = createContext(true);

export function CodeBlock({ children, text }: { children: ReactNode; text: string }) {
  const visible = useContext(CodeBlockCopyVisible);
  if (!text) {
    return <pre className="overflow-auto rounded-control bg-surface-2 p-3">{children}</pre>;
  }
  return (
    <div className="min-w-0 rounded-control bg-surface-2 p-3">
      <div className="mb-1 flex min-h-8 items-center justify-end gap-2">
        {visible && <CopyCode text={text} />}
      </div>
      <pre className="overflow-auto">{children}</pre>
    </div>
  );
}

function CopyCode({ text }: { text: string }) {
  const { t } = useLang();
  const [status, setStatus] = useState<"idle" | "pending" | "copied" | "failed">("idle");
  async function copy() {
    setStatus("pending");
    try {
      await copyText(text);
      setStatus("copied");
    } catch {
      setStatus("failed");
    }
  }
  return (
    <>
      {status === "failed" && (
        <span role="status" className="min-w-0 text-danger text-secondary">
          {t("markdown.copyFailed")}
        </span>
      )}
      <Button
        variant="icon"
        className="size-8 shrink-0 p-0 text-secondary"
        aria-label={t(status === "copied" ? "common.copied" : "markdown.copyCode")}
        title={t("markdown.copyCode")}
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
    </>
  );
}
