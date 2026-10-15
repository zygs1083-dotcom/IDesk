import { labels } from "@idesk/shared/labels";
import { useLang } from "../i18n/lang.tsx";

import { PixelButton } from "./pixel-button.tsx";
import { PixelPanel } from "./pixel-panel.tsx";
import type { Agent, Task } from "./use-office-data.ts";

export function TaskPanel({
  task,
  agents,
  onClose,
}: {
  task: Task;
  agents: Agent[];
  onClose: () => void;
}) {
  const { lang, t } = useLang();
  const assignee = agents.find((agent) => agent.id === task.assigneeId);
  return (
    <PixelPanel title={t("panel.task")} onClose={onClose}>
      <h3>{task.title}</h3>
      <dl>
        <dt>{t("common.capabilities")}</dt>
        <dd>{task.capabilities.join(" · ") || t("common.none")}</dd>
        <dt>{t("panel.priority")}</dt>
        <dd>{labels(lang).priority[task.priority]}</dd>
        <dt>{t("panel.status")}</dt>
        <dd>{labels(lang).status[task.status]}</dd>
        <dt>{t("panel.assignee")}</dt>
        <dd>{assignee?.name || t("panel.unassigned")}</dd>
      </dl>
      <PixelButton href={`/desk?task=${encodeURIComponent(task.id)}`}>
        {t("panel.openBoard")}
      </PixelButton>
    </PixelPanel>
  );
}
