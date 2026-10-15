import {
  AGENT_KINDS,
  type registerAgentSchema,
  type registeredAgentSchema,
} from "@idesk/shared/agent-schemas";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import type { z } from "zod";
import { Button } from "../../components/button.tsx";
import { Dialog } from "../../components/dialog.tsx";
import { Field } from "../../components/field.tsx";
import { useLang } from "../../i18n/lang.tsx";
import { request } from "../../lib/api.ts";
import type { Agent } from "../../lib/types.ts";

export function CreateAgent({ agent, onClose }: { agent?: Agent; onClose: () => void }) {
  const { t } = useLang();
  const client = useQueryClient();
  const [name, setName] = useState(agent?.name ?? "");
  const [kind, setKind] = useState<z.infer<typeof registerAgentSchema>["kind"]>(
    agent?.kind ?? "codex",
  );
  const [host, setHost] = useState(agent?.host ?? "");
  const [capabilities, setCapabilities] = useState(agent?.capabilities.join(" ") ?? "");
  const [webhookUrl, setWebhookUrl] = useState(agent?.webhookUrl ?? "");
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState("");
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
          capabilities: capabilities.split(/[\s,，]+/).filter(Boolean),
          webhookUrl: webhookUrl.trim() || null,
        }),
      }),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: ["agents"] });
      onClose();
    },
  });
  const error = update.error ?? create.error;
  async function copyKey() {
    if (!create.data) return;
    try {
      await navigator.clipboard.writeText(create.data.apiKey);
      setCopyError("");
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopyError(t("agents.copyFailed"));
    }
  }
  return (
    <Dialog
      open
      onClose={onClose}
      title={
        agent
          ? t("agents.editAgent")
          : create.data
            ? t("agents.agentCreated")
            : t("agents.createAgent")
      }
    >
      {create.data ? (
        <div className="space-y-4">
          <code className="block break-all rounded-control bg-surface-2 p-3 text-secondary">
            {create.data.apiKey}
          </code>
          <p className="text-secondary text-text-2">{t("agents.shownOnlyOnce")}</p>
          {copyError && (
            <p role="alert" className="text-secondary text-status-failed">
              {copyError}
            </p>
          )}
          <div className="flex justify-end gap-2">
            <Button onClick={copyKey}>{copied ? t("agents.copied") : t("agents.copy")}</Button>
            <Button variant="primary" onClick={onClose}>
              {t("agents.complete")}
            </Button>
          </div>
        </div>
      ) : (
        <form
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
              capabilities: capabilities.split(/[\s,，]+/).filter(Boolean),
            });
          }}
        >
          <Field
            label={t("agents.name")}
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
          {agent ? (
            <Field label={t("agents.type")} value={kind} readOnly />
          ) : (
            <label className="block space-y-2 text-secondary text-text-2">
              {t("agents.type")}
              <select
                className="block w-full rounded-control border border-line bg-surface-2 px-3 py-2 text-body text-text focus:border-accent"
                value={kind}
                onChange={(event) => setKind(event.target.value as typeof kind)}
              >
                {AGENT_KINDS.map((value) => (
                  <option key={value}>{value}</option>
                ))}
              </select>
            </label>
          )}
          <Field
            label={t("agents.host")}
            value={host}
            onChange={(event) => setHost(event.target.value)}
          />
          <Field
            label={t("agents.capabilities")}
            placeholder={t("agents.separateWithSpacesOrCommas")}
            value={capabilities}
            onChange={(event) => setCapabilities(event.target.value)}
          />
          <Field
            label="Webhook"
            type="url"
            value={webhookUrl}
            onChange={(event) => setWebhookUrl(event.target.value)}
          />
          {error && (
            <p role="alert" className="text-secondary text-status-failed">
              {error.message}
            </p>
          )}
          <div className="flex justify-end gap-2">
            <Button onClick={onClose}>{t("agents.cancel")}</Button>
            <Button
              type="submit"
              variant="primary"
              disabled={!name.trim() || create.isPending || update.isPending}
            >
              {t("agents.confirm")}
            </Button>
          </div>
        </form>
      )}
    </Dialog>
  );
}
