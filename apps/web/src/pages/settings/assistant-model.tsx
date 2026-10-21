import type { AssistantSettings } from "@idesk/shared/assistant-schemas";
import { useQuery } from "@tanstack/react-query";
import { useLang } from "../../i18n/lang.tsx";
import { request } from "../../lib/api.ts";
import { AssistantModelForm } from "./assistant-model-form.tsx";

export function AssistantModel() {
  const { t } = useLang();
  const settings = useQuery({
    queryKey: ["assistant", "settings"],
    queryFn: () => request<AssistantSettings>("/assistant/settings"),
  });
  return (
    <section aria-label={t("assistant.model")} className="space-y-3">
      <h3 data-ui="fixed-label" className="text-section">
        {t("assistant.model")}
      </h3>
      {settings.isPending && (
        <p role="status" className="text-secondary text-text-2">
          {t("common.loading")}
        </p>
      )}
      {settings.error && (
        <p role="alert" className="text-secondary text-status-failed">
          {settings.error.message}
        </p>
      )}
      {settings.data && <AssistantModelForm settings={settings.data} />}
    </section>
  );
}
