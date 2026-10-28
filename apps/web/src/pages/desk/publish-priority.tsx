import { labels } from "@idesk/shared/labels";
import { TASK_PRIORITIES, type TaskPriority } from "@idesk/shared/task-status";
import { Segmented } from "../../components/segmented.tsx";
import { useLang } from "../../i18n/lang.tsx";

export function PublishPriority({
  value,
  onChange,
}: {
  value: TaskPriority;
  onChange: (value: TaskPriority) => void;
}) {
  const { lang, t } = useLang();
  return (
    <div className="space-y-2">
      <span className="pixel-legacy text-secondary text-text-2">{t("common.priority")}</span>
      <Segmented
        formField
        label={t("common.priority")}
        value={value}
        onChange={onChange}
        options={TASK_PRIORITIES.map((priority) => ({
          value: priority,
          label: labels(lang).priority[priority],
        }))}
      />
    </div>
  );
}
