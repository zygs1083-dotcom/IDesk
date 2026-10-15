import type { ScheduleAction } from "@idesk/shared/schedule-schemas";
import { Segmented } from "../../components/segmented.tsx";
import { useLang } from "../../i18n/lang.tsx";
import type { Connector } from "./types.ts";

export function ActionTabs({
  action,
  onChange,
  connectors,
}: {
  action: ScheduleAction;
  onChange: (action: ScheduleAction) => void;
  connectors: Connector[];
}) {
  const { t } = useLang();
  const firstTrigger = connectors[0];
  const options: { value: ScheduleAction["type"]; label: string }[] = [
    { value: "publish_task", label: t("common.publishTask") },
    { value: "http", label: t("schedules.httpRequest") },
  ];
  if (firstTrigger)
    options.push({ value: "connector_trigger", label: t("schedules.triggerConnector") });
  return (
    <Segmented
      label={t("common.action")}
      options={options}
      value={action.type}
      onChange={(type) => {
        switch (type) {
          case "publish_task":
            onChange({ type, template: { title: "", priority: "normal" } });
            break;
          case "http":
            onChange({ type, method: "GET", url: "", headers: {} });
            break;
          case "connector_trigger":
            if (firstTrigger)
              onChange({ type, connectorId: firstTrigger.id, jobExternalId: "", params: {} });
            break;
        }
      }}
    />
  );
}
