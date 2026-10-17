import {
  AGENT_KINDS,
  type registerAgentSchema,
  type registeredAgentSchema,
} from "@idesk/shared/agent-schemas";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import type { z } from "zod";
import { Button } from "../../components/button.tsx";
import { CapabilityPicker } from "../../components/capability-picker.tsx";
import { Dialog } from "../../components/dialog.tsx";
import { Field } from "../../components/field.tsx";
import { useLang } from "../../i18n/lang.tsx";
import { request } from "../../lib/api.ts";
import type { Agent } from "../../lib/types.ts";
import { useAgents } from "../../lib/use-agents.ts";

export function CreateAgent({ agent, onClose }: { agent?: Agent; onClose: () => void }) {
  const { t } = useLang();
  const client = useQueryClient();
  const { agents } = useAgents();
  const [name, setName] = useState(agent?.name ?? "");
  const [kind, setKind] = useState<z.infer<typeof registerAgentSchema>["kind"]>(
    agent?.kind ?? "codex",
  );
  const [host, setHost] = useState(agent?.host ?? "");
  const [capabilities, setCapabilities] = useState<string[]>(agent?.capabilities ?? []);
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
  async function copyKey() {
    if (!create.data) return;
    try {
      await navigator.clipboard.writeText(create.data.apiKey);
      setCopyError("");
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopyError(t("agents.copyKeyFailed"));
    }
  }
  return (
    <Dialog
      open
      onClose={onClose}
      title={agent ? t("agents.edit") : create.data ? t("agents.created") : t("agents.create")}
    >
      {create.data ? (
        <div className="space-y-4">
          <code className="block break-all rounded-control bg-surface-2 p-3 text-secondary">
            {create.data.apiKey}
          </code>
          <p className="text-secondary text-text-2">{t("agents.keyOnce")}</p>
          {copyError && (
            <p role="alert" className="text-secondary text-status-failed">
              {copyError}
            </p>
          )}
          <div className="flex justify-end gap-2">
            <Button onClick={copyKey}>{copied ? t("common.copied") : t("common.copy")}</Button>
            <Button variant="primary" onClick={onClose}>
              {t("common.complete")}
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
            <Field label={t("common.type")} value={kind} readOnly />
          ) : (
            <label className="block space-y-2 text-secondary text-text-2">
              {t("common.type")}
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
          <div className="flex justify-end gap-2">
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
