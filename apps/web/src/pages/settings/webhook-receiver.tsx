import { useLang } from "../../i18n/lang.tsx";

export function WebhookReceiver() {
  const { t } = useLang();
  const items = [
    [
      t("settings.webhookEvents"),
      t("settings.webhookEventsDescription", {
        created: "`task.created`",
        assign: "`task.assign`",
        handoff: "`task.handoff`",
        relay: "`relay.sent`",
      }),
    ],
    [
      t("settings.webhookBody"),
      t("settings.webhookBodyDescription", {
        endpoint: "`GET /api/v1/events`",
        fields: "`id`, `ts`, `type`, `taskId`, `agentId`, `payload`",
      }),
    ],
    [
      t("settings.webhookSignature"),
      t("settings.webhookSignatureDescription", {
        header: "`X-IDesk-Signature: sha256=<hex>`",
        formula: "`hex = HMAC_SHA256(key = sha256_hex(apiKey), body)`",
      }),
    ],
    [
      t("settings.webhookRetry"),
      t("settings.webhookRetryDescription", { event: "`webhook.failed`" }),
    ],
    [
      t("settings.webhookDeduplication"),
      t("settings.webhookDeduplicationDescription", { id: "`id`" }),
    ],
    [
      t("settings.webhookHeartbeat"),
      t("settings.webhookHeartbeatDescription", { endpoint: "`POST /api/v1/agents/me/heartbeat`" }),
    ],
  ] as const;
  return (
    <div data-ui="webhook-receiver" className="space-y-4">
      <h3 className="text-section">{t("settings.webhookReceiver")}</h3>
      <dl className="rounded-panel border border-line bg-surface">
        {items.map(([title, description]) => (
          <div key={title} className="space-y-2 border-b border-line p-4 last:border-b-0">
            <dt className="text-body">{title}</dt>
            <dd className="text-secondary text-text-2">
              {description.split(/`([^`]+)`/).map((part, index) =>
                index % 2 ? (
                  <code key={part} className="select-text break-words text-text">
                    {part}
                  </code>
                ) : (
                  part
                ),
              )}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
