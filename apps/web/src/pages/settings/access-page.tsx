import { useLang } from "../../i18n/lang.tsx";
import { AccessRow } from "./access-row.tsx";
import { WebhookReceiver } from "./webhook-receiver.tsx";

export function AccessPage() {
  const { t } = useLang();
  const origin = location.origin;
  return (
    <section className="space-y-4" aria-label={t("settings.access")}>
      <h2 className="text-section">{t("settings.access")}</h2>
      <div className="rounded-panel border border-line bg-surface">
        <AccessRow title={t("settings.restUrl")} value={`${origin}/api/v1`} />
        <AccessRow
          title={t("settings.mcpUrl")}
          value={`${origin}/mcp`}
          description={t("settings.mcpDescription")}
        />
        <AccessRow title={t("settings.cliLogin")} value={t("settings.cliCommand", { origin })} />
      </div>
      <WebhookReceiver />
    </section>
  );
}
