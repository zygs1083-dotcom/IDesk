import type { ScheduleAction } from "@idesk/shared/schedule-schemas";
import { useQuery } from "@tanstack/react-query";
import { Menu } from "../../components/menu.tsx";
import { useLang } from "../../i18n/lang.tsx";
import { request } from "../../lib/api.ts";
import type { Schedule } from "../schedules/types.ts";

export function PublishTemplates({
  onSelect,
}: {
  onSelect: (template: Extract<ScheduleAction, { type: "publish_task" }>["template"]) => void;
}) {
  const { t } = useLang();
  const { data: schedules } = useQuery({
    queryKey: ["schedules"],
    queryFn: () => request<Schedule[]>("/schedules"),
  });
  const items =
    schedules?.flatMap(({ name, action }) =>
      action.type === "publish_task"
        ? [{ label: name, onSelect: () => onSelect(action.template) }]
        : [],
    ) ?? [];
  if (!items.length) return null;
  return <Menu label={t("desk.templates")} trigger={t("desk.templates")} items={items} />;
}
