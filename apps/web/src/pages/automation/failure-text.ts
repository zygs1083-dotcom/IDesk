import type { automationRunWithJobSchema } from "@idesk/shared/automation-schemas";
import type { z } from "zod";
import type { Translate } from "../../i18n/translate.ts";

export function failureText(
  run: z.infer<typeof automationRunWithJobSchema>,
  connectorName: string,
  t: Translate,
): string {
  const lines = [
    `${t("automation.connector")}: ${connectorName}`,
    `${t("automation.workflow")}: ${run.jobName}`,
  ];
  if (run.jobGroup?.trim() && run.jobGroup.trim() !== run.jobName.trim()) {
    lines.push(`${t("automation.project")}: ${run.jobGroup}`);
  }
  lines.push(
    `${t("automation.externalId")}: ${run.externalId}`,
    `${t("automation.startedAt")}: ${run.startedAt ?? "—"}`,
    `${t("automation.finishedAt")}: ${run.finishedAt ?? "—"}`,
    "",
    `${t("automation.errorSummary")}:`,
    run.error?.trim() ? run.error : t("automation.noErrorSummary"),
  );
  if (run.url?.trim()) lines.push("", `${t("automation.sourceUrl")}: ${run.url}`);
  return lines.join("\n");
}
