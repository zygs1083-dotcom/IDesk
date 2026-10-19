import {
  AGENT_KIND_LABELS,
  AGENT_KINDS,
  type registerAgentSchema,
  type registeredAgentSchema,
} from "@idesk/shared/agent-schemas";
import type { Lang } from "@idesk/shared/labels";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import type { z } from "zod";
import { Button } from "../../components/button.tsx";
import { CapabilityPicker } from "../../components/capability-picker.tsx";
import { Dialog } from "../../components/dialog.tsx";
import { Field } from "../../components/field.tsx";
import { useLang } from "../../i18n/lang.tsx";
import { translator } from "../../i18n/translate.ts";
import { request } from "../../lib/api.ts";
import { copyText } from "../../lib/clipboard.ts";
import type { Agent } from "../../lib/types.ts";
import { useAgents } from "../../lib/use-agents.ts";

export function agentOnboardingMessage(
  lang: Lang,
  origin: string,
  name: string,
  key: string,
  rotated: boolean,
): string {
  const t = translator(lang);
  return [
    t("agents.onboardingGuide", { origin }),
    t("agents.onboardingName", { name }),
    key,
    t("agents.onboardingInstructions"),
    ...(rotated ? [t("agents.onboardingRotated")] : []),
  ].join("\n");
}

export function CreateAgent({ agent, onClose }: { agent?: Agent; onClose: () => void }) {
  const { lang, t } = useLang();
  const client = useQueryClient();
  const { agents } = useAgents();
  const [name, setName] = useState(agent?.name ?? "");
  const [kind, setKind] = useState<z.infer<typeof registerAgentSchema>["kind"]>(
    agent?.kind ?? "codex",
  );
  const [host, setHost] = useState(agent?.host ?? "");
  const [capabilities, setCapabilities] = useState<string[]>(agent?.capabilities ?? []);
  const [webhookUrl, setWebhookUrl] = useState(agent?.webhookUrl ?? "");
  const [copied, setCopied] = useState<"key" | "message" | null>(null);
  const [copyError, setCopyError] = useState<"key" | "message" | null>(null);
  const create = useMutation({
    mutationFn: (input: z.infer<typeof registerAgentSchema>) =>
      request<z.infer<typeof registeredAgentSchema>>("/agents", {
        method: "POST",
        body: JSON.stringify(input),
      }),
    onSuccess: () => client.invalidateQueries({ queryKey: ["agents"] }),
  });
  const update = useMutation({
    mutationFn: () =>
      request<Agent>(`/agents/${agent?.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          name: name.trim(),
          host: host.trim(),
          capabilities,
          webhookUrl: webhookUrl.trim() || null,
        }),
      }),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: ["agents"] });
      onClose();
    },
  });
  const error = update.error ?? create.error;
  async function copy(value: "key" | "message") {
    if (!create.data) return;
    try {
      await copyText(
        value === "key"
          ? create.data.apiKey
          : agentOnboardingMessage(
              lang,
              location.origin,
              create.data.agent.name,
              create.data.apiKey,
              false,
            ),
      );
      setCopyError(null);
      setCopied(value);
    } catch {
      setCopied(null);
      setCopyError(value);
    }
  }
  return (
    <Dialog
      open
      onClose={onClose}
      title={agent ? t("agents.edit") : create.data ? t("agents.created") : t("agents.create")}
      footer={
        create.data ? (
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
            <Button
              type="submit"
              form="agent-form"
              variant="primary"
              disabled={!name.trim() || create.isPending || update.isPending}
            >
              {t("common.confirm")}
            </Button>
          </>
        )
      }
    >
      {create.data ? (
        <div className="space-y-4">
          <code className="block break-all rounded-control bg-surface-2 p-3 text-secondary">
            {create.data.apiKey}
          </code>
          <p className="text-secondary text-text-2">{t("agents.keyOnce")}</p>
          {copyError && (
            <p role="alert" className="text-secondary text-status-failed">
              {t(copyError === "key" ? "agents.copyKeyFailed" : "agents.copyMessageFailed")}
            </p>
          )}
          {copyError === "message" && (
            <Field
              multiline
              readOnly
              label={t("agents.copyMessage")}
              rows={7}
              value={agentOnboardingMessage(
                lang,
                location.origin,
                create.data.agent.name,
                create.data.apiKey,
                false,
              )}
            />
          )}
          <div className="pixel-legacy flex justify-end gap-2">
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
          </div>
        </div>
      ) : (
        <form
          id="agent-form"
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            if (agent) {
              update.mutate();
              return;
            }
            create.mutate({
              name: name.trim(),
              kind,
              host: host.trim(),
              ...(webhookUrl.trim() ? { webhookUrl: webhookUrl.trim() } : {}),
              capabilities,
            });
          }}
        >
          <Field
            label={t("common.name")}
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
          {agent ? (
            <Field label={t("common.type")} value={AGENT_KIND_LABELS[kind]} readOnly />
          ) : (
            <label
              data-ui="form-select-label"
              className="block space-y-2 text-secondary text-text-2"
            >
              {t("common.type")}
              <select
                className="block w-full rounded-control border border-line bg-surface-2 px-3 py-2 text-body text-text focus:border-accent"
                value={kind}
                onChange={(event) => setKind(event.target.value as typeof kind)}
              >
                {AGENT_KINDS.map((value) => (
                  <option key={value} value={value}>
                    {AGENT_KIND_LABELS[value]}
                  </option>
                ))}
              </select>
            </label>
          )}
          <Field
            label={t("common.host")}
            value={host}
            onChange={(event) => setHost(event.target.value)}
          />
          <CapabilityPicker
            label={t("common.capabilities")}
            value={capabilities}
            onChange={setCapabilities}
            agents={agents}
            description={t("capability.agentDescription")}
            presetShortcuts
            mode="multi"
          />
          <Field
            label="Webhook"
            type="password"
            value={webhookUrl}
            onChange={(event) => setWebhookUrl(event.target.value)}
          />
          {agent && <p className="text-secondary text-text-2">{t("common.hiddenValuesHint")}</p>}
          {error && (
            <p role="alert" className="text-secondary text-status-failed">
              {error.message}
            </p>
          )}
          <div className="pixel-legacy flex justify-end gap-2">
            <Button onClick={onClose}>{t("common.cancel")}</Button>
            <Button
              type="submit"
              variant="primary"
              disabled={!name.trim() || create.isPending || update.isPending}
            >
              {t("common.confirm")}
            </Button>
          </div>
        </form>
      )}
    </Dialog>
  );
}
