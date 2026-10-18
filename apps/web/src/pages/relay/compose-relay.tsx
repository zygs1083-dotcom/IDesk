import { labels } from "@idesk/shared/labels";
import { RELAY_KINDS } from "@idesk/shared/relay";
import type { relayMessageSchema, sendRelaySchema } from "@idesk/shared/relay-schemas";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import type { z } from "zod";
import { Button } from "../../components/button.tsx";
import { capabilityCountKey } from "../../components/capability-options.ts";
import { CapabilityPicker } from "../../components/capability-picker.tsx";
import { Dialog } from "../../components/dialog.tsx";
import { Field } from "../../components/field.tsx";
import { Segmented } from "../../components/segmented.tsx";
import { useLang } from "../../i18n/lang.tsx";
import { request } from "../../lib/api.ts";
import { cn } from "../../lib/cn.ts";
import { useAgents } from "../../lib/use-agents.ts";

import { TaskPicker } from "./task-picker.tsx";

type Input = z.infer<typeof sendRelaySchema>;

export function ComposeRelay({
  reply,
  onClose,
}: {
  reply: z.infer<typeof relayMessageSchema> | undefined;
  onClose: () => void;
}) {
  const { lang, t } = useLang();
  const client = useQueryClient();
  const { agents, agentName } = useAgents();
  const [recipient, setRecipient] = useState<"agent" | "capability" | "broadcast">("broadcast");
  const [agentId, setAgentId] = useState("");
  const [capability, setCapability] = useState("");
  const [kind, setKind] = useState<Input["kind"]>(reply ? "reply" : "note");
  const [subject, setSubject] = useState(
    reply ? t("relay.replySubject", { subject: reply.subject }) : "",
  );
  const [body, setBody] = useState("");
  const [taskId, setTaskId] = useState(reply?.taskId ?? "");
  const send = useMutation({
    mutationFn: (input: Input) =>
      request<z.infer<typeof relayMessageSchema>>("/relay", {
        method: "POST",
        body: JSON.stringify(input),
      }),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: ["relay"] });
      onClose();
    },
  });
  const receivers = agents.filter((agent) => agent.capabilities.includes(capability)).length;
  const valid =
    subject.trim() &&
    (reply || recipient === "broadcast" || (recipient === "agent" ? agentId : capability.trim()));
  return (
    <Dialog
      open
      onClose={onClose}
      title={reply ? t("relay.replyMessage") : t("relay.sendMessage")}
      footer={
        <>
          <Button onClick={onClose}>{t("common.cancel")}</Button>
          <Button
            type="submit"
            form="compose-relay-form"
            variant="primary"
            disabled={!valid || send.isPending}
          >
            {t("common.send")}
          </Button>
        </>
      }
    >
      <form
        id="compose-relay-form"
        className="space-y-4"
        onSubmit={(event) => {
          event.preventDefault();
          const to: Input["to"] =
            recipient === "agent"
              ? { kind: "agent", id: agentId }
              : recipient === "capability"
                ? { kind: "capability", value: capability.trim() }
                : { kind: "broadcast" };
          send.mutate({
            ...(reply ? {} : { to }),
            kind,
            subject: subject.trim(),
            body,
            ...(taskId.trim() ? { taskId: taskId.trim() } : {}),
            ...(reply ? { replyTo: reply.id } : {}),
          });
        }}
      >
        {!reply && (
          <div className="space-y-2">
            <p className="text-secondary text-text-2">{t("relay.recipient")}</p>
            <Segmented
              label={t("relay.recipient")}
              value={recipient}
              onChange={setRecipient}
              options={[
                { value: "agent", label: t("relay.specificAgent") },
                { value: "capability", label: t("common.capabilities") },
                { value: "broadcast", label: t("common.everyone") },
              ]}
            />
          </div>
        )}
        {!reply && recipient === "agent" && (
          <label className="block space-y-2 text-secondary text-text-2">
            {t("nav.agents")}
            <select
              className="block w-full rounded-control border border-line bg-surface-2 px-3 py-2 text-body text-text focus:border-accent"
              value={agentId}
              onChange={(event) => setAgentId(event.target.value)}
            >
              <option value="">{t("relay.selectAgent")}</option>
              {agents.map((agent) => (
                <option key={agent.id} value={agent.id}>
                  {agentName(agent.id)}
                </option>
              ))}
            </select>
          </label>
        )}
        {!reply && recipient === "capability" && (
          <div className="space-y-2">
            <CapabilityPicker
              label={t("common.capabilities")}
              value={capability ? [capability] : []}
              onChange={(values) => setCapability(values[0] ?? "")}
              agents={agents}
              description={t("capability.relayDescription")}
              mode="single"
            />
            <p
              aria-live="polite"
              className={cn(
                "text-secondary",
                receivers === 0 ? "text-status-paused" : "text-text-2",
              )}
            >
              {t(capabilityCountKey("recipients", receivers), { total: receivers })}
            </p>
          </div>
        )}
        <div className="space-y-2">
          <p className="text-secondary text-text-2">{t("relay.kind")}</p>
          <Segmented
            label={t("relay.kind")}
            value={kind}
            onChange={setKind}
            options={RELAY_KINDS.map((value) => ({ value, label: labels(lang).relayKind[value] }))}
          />
        </div>
        <Field
          label={t("common.title")}
          value={subject}
          onChange={(event) => setSubject(event.target.value)}
        />
        <Field
          multiline
          label={t("common.body")}
          rows={6}
          placeholder="Markdown"
          value={body}
          onChange={(event) => setBody(event.target.value)}
        />
        <TaskPicker value={taskId} onChange={setTaskId} />
        {send.error && (
          <p role="alert" className="text-secondary text-status-failed">
            {send.error.message}
          </p>
        )}
        <div className="pixel-legacy flex justify-end gap-2">
          <Button onClick={onClose}>{t("common.cancel")}</Button>
          <Button type="submit" variant="primary" disabled={!valid || send.isPending}>
            {t("common.send")}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
