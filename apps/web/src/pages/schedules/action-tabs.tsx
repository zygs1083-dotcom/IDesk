import type { ScheduleAction } from "@idesk/shared/schedule-schemas";
import { Segmented } from "../../components/segmented.tsx";
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
  const firstTrigger = connectors[0];
  const options: { value: ScheduleAction["type"]; label: string }[] = [
    { value: "publish_task", label: "发布任务" },
    { value: "http", label: "HTTP 请求" },
  ];
  if (firstTrigger) options.push({ value: "connector_trigger", label: "触发连接器" });
  return (
    <Segmented
      label="动作"
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
