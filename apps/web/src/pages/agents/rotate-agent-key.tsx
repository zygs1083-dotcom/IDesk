import type { registeredAgentSchema } from "@idesk/shared/agent-schemas";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import type { z } from "zod";
import { Button } from "../../components/button.tsx";
import { Dialog } from "../../components/dialog.tsx";
import { Field } from "../../components/field.tsx";
import { useLang } from "../../i18n/lang.tsx";
import { request } from "../../lib/api.ts";
import { copyText } from "../../lib/clipboard.ts";
import type { Agent } from "../../lib/types.ts";
import { agentOnboardingMessage } from "./create-agent.tsx";

export function RotateAgentKey({ agent, onClose }: { agent: Agent; onClose: () => void }) {
  const { lang, t } = useLang();
  const client = useQueryClient();
  const [key, setKey] = useState("");
  const [copied, setCopied] = useState<"key" | "message" | null>(null);
  const [copyError, setCopyError] = useState<"key" | "message" | null>(null);
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
  async function copy(value: "key" | "message") {
    try {
      await copyText(
        value === "key"
          ? key
          : agentOnboardingMessage(lang, location.origin, agent.name, key, true),
      );
      setCopied(value);
      setCopyError(null);
    } catch {
      setCopied(null);
      setCopyError(value);
    }
  }
  return (
    <Dialog
      open
      onClose={onClose}
      title={key ? t("agents.keyRotated") : t("agents.rotateKey")}
      footer={
        key ? (
          <>
            <Button className="whitespace-nowrap px-2 sm:px-3" onClick={() => copy("key")}>
              {copied === "key" ? t("common.copied") : t("common.copy")}
            </Button>
            <Button className="whitespace-nowrap px-2 sm:px-3" onClick={onClose}>
              {t("common.complete")}
            </Button>
            <Button
              variant="primary"
              className="whitespace-nowrap px-2 sm:px-3"
              onClick={() => copy("message")}
            >
              {copied === "message" ? t("common.copied") : t("agents.copyMessage")}
            </Button>
          </>
        ) : (
          <>
            <Button onClick={onClose}>{t("common.cancel")}</Button>
            <Button variant="danger" disabled={rotate.isPending} onClick={() => rotate.mutate()}>
              {t("common.confirm")}
            </Button>
          </>
        )
      }
    >
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
            {rotate.error?.message ||
              t(copyError === "key" ? "agents.copyKeyFailed" : "agents.copyMessageFailed")}
          </p>
        )}
        {copyError === "message" && (
          <Field
            multiline
            readOnly
            label={t("agents.copyMessage")}
            rows={7}
            value={agentOnboardingMessage(lang, location.origin, agent.name, key, true)}
          />
        )}
        <div className="pixel-legacy flex justify-end gap-2">
          {key ? (
            <>
              <Button className="whitespace-nowrap px-2 sm:px-3" onClick={() => copy("key")}>
                {copied === "key" ? t("common.copied") : t("common.copy")}
              </Button>
              <Button className="whitespace-nowrap px-2 sm:px-3" onClick={onClose}>
                {t("common.complete")}
              </Button>
              <Button
                variant="primary"
                className="whitespace-nowrap px-2 sm:px-3"
                onClick={() => copy("message")}
              >
                {copied === "message" ? t("common.copied") : t("agents.copyMessage")}
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
