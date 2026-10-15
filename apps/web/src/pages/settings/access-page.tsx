import { useLang } from "../../i18n/lang.tsx";
import { AccessRow } from "./access-row.tsx";

export function AccessPage() {
  const { t } = useLang();
  const origin = location.origin;
  return (
    <section className="space-y-4" aria-label={t("settings.access")}>
      <h2 className="text-section">{t("settings.access")}</h2>
      <div className="rounded-panel border border-line bg-surface">
        <AccessRow title={t("settings.restBaseURL")} value={`${origin}/api/v1`} />
        <AccessRow
          title={t("settings.mcpURL")}
          value={`${origin}/mcp`}
          description="Streamable HTTP，Authorization: Bearer <key>"
        />
        <AccessRow
          title={t("settings.cliLogin")}
          value={t("settings.ideskLoginUrlKeyKeyFromAgent", { p1: origin })}
        />
        <AccessRow
          title={t("settings.webhookSignature")}
          value="X-IDesk-Signature: sha256=HMAC(sha256(key), body)"
          description={t("settings.useTheSHA256HexDigestOf")}
        />
      </div>
    </section>
  );
}
