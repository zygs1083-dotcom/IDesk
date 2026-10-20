import type { bindCodeSchema } from "@idesk/shared/people-schemas";
import { useEffect, useState } from "react";
import type { z } from "zod";
import { Button } from "../../components/button.tsx";
import { Dialog } from "../../components/dialog.tsx";
import { useLang } from "../../i18n/lang.tsx";
import { copyText } from "../../lib/clipboard.ts";

export function BindCodeDialog({
  code,
  error,
  onClose,
}: {
  code: z.infer<typeof bindCodeSchema> | undefined;
  error: Error | null;
  onClose: () => void;
}) {
  const { t } = useLang();
  const [now, setNow] = useState(Date.now());
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState("");
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);
  const minutes = code ? Math.max(0, Math.ceil((Date.parse(code.expiresAt) - now) / 60_000)) : 0;
  async function copy() {
    if (!code) return;
    try {
      await copyText(t("people.bindCommand", { code: code.code }));
      setCopied(true);
      setCopyError("");
    } catch {
      setCopyError(t("people.copyFailed"));
    }
  }
  return (
    <Dialog
      open
      title={t("people.bindCode")}
      onClose={onClose}
      footer={<Button onClick={onClose}>{t("common.close")}</Button>}
    >
      <div className="space-y-4">
        {!code && !error && <p role="status">{t("common.loading")}</p>}
        {error && (
          <p role="alert" className="text-status-failed">
            {error.message}
          </p>
        )}
        {code && (
          <>
            <p
              data-ui="bind-code"
              className="select-text text-center text-4xl tabular-nums tracking-widest"
            >
              {code.code}
            </p>
            <p role="status" className="text-center text-secondary text-text-2">
              {t(minutes > 0 ? "people.expires" : "people.expired", { minutes })}
            </p>
            <p className="text-body">{t("people.bindInstruction", { code: code.code })}</p>
            <Button disabled={minutes === 0} onClick={() => void copy()}>
              {t(copied ? "common.copied" : "common.copy")}
            </Button>
            {copyError && (
              <p role="alert" className="text-secondary text-status-failed">
                {copyError}
              </p>
            )}
          </>
        )}
      </div>
    </Dialog>
  );
}
