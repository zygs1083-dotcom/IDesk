import type { registeredAgentSchema } from "@idesk/shared/agent-schemas";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import type { z } from "zod";
import { Button } from "../../components/button.tsx";
import { Dialog } from "../../components/dialog.tsx";
import { useLang } from "../../i18n/lang.tsx";
import { request } from "../../lib/api.ts";
import type { Agent } from "../../lib/types.ts";

export function RotateAgentKey({ agent, onClose }: { agent: Agent; onClose: () => void }) {
  const { t } = useLang();
  const client = useQueryClient();
  const [key, setKey] = useState("");
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState("");
  const rotate = useMutation({
    mutationFn: async () => {
      const result = await request<z.infer<typeof registeredAgentSchema>>(
        `/agents/${agent.id}/rotate-key`,
        { method: "POST" },
      );
      setKey(result.apiKey);
    },
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: ["agents"] });
    },
  });
  async function copyKey() {
    try {
      await navigator.clipboard.writeText(key);
      setCopied(true);
      setCopyError("");
    } catch {
      setCopyError(t("agents.copyKeyFailed"));
    }
  }
  return (
    <Dialog open onClose={onClose} title={key ? t("agents.keyRotated") : t("agents.rotateKey")}>
      <div className="space-y-4">
        {key ? (
          <>
            <code className="block break-all rounded-control bg-surface-2 p-3 text-secondary">
              {key}
            </code>
            <p className="text-secondary text-text-2">{t("agents.keyOnce")}</p>
          </>
        ) : (
          <p className="text-secondary text-text-2">{t("agents.rotateWarning")}</p>
        )}
        {(rotate.error || copyError) && (
          <p role="alert" className="text-secondary text-status-failed">
            {rotate.error?.message || copyError}
          </p>
        )}
        <div className="flex justify-end gap-2">
          {key ? (
            <>
              <Button onClick={copyKey}>{copied ? t("common.copied") : t("common.copy")}</Button>
              <Button variant="primary" onClick={onClose}>
                {t("common.complete")}
              </Button>
            </>
          ) : (
            <>
              <Button onClick={onClose}>{t("common.cancel")}</Button>
              <Button variant="danger" disabled={rotate.isPending} onClick={() => rotate.mutate()}>
                {t("common.confirm")}
              </Button>
            </>
          )}
        </div>
      </div>
    </Dialog>
  );
}
