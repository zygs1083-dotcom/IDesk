import { type Lang, labels } from "@idesk/shared/labels";
import { translator } from "../../i18n/translate.ts";
import type { Task } from "../../lib/types.ts";

export function taskMarkdown(task: Task, lang: Lang, origin: string): string {
  const t = translator(lang);
  const title = task.title.replace(/[!-/:-@[-`{-~]/g, "\\$&");
  const link = `${origin}/desk?${new URLSearchParams({ task: task.id })}`;
  const sections = [
    `# ${title}`,
    labels(lang).status[task.status],
    link,
    `## ${t("desk.requirements")}\n\n${task.body}`,
  ];
  if (task.result?.trim()) {
    sections.push(`## ${t("desk.executionResult")}\n\n${task.result}`);
  }

  return sections.join("\n\n");
}
