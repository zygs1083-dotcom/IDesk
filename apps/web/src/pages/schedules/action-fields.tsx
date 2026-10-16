import { labels } from "@idesk/shared/labels";
import type { ScheduleAction } from "@idesk/shared/schedule-schemas";
import { TASK_PRIORITIES } from "@idesk/shared/task-status";
import { CapabilityPicker } from "../../components/capability-picker.tsx";
import { ClaimableHint } from "../../components/claimable-hint.tsx";
import { Field } from "../../components/field.tsx";
import { Segmented } from "../../components/segmented.tsx";
import { useLang } from "../../i18n/lang.tsx";
import { useAgents } from "../../lib/use-agents.ts";
import type { Connector } from "./types.ts";

export function ActionFields({
  action,
  onChange,
  connectors,
  headers,
  setHeaders,
  params,
  setParams,
  capabilities,
  setCapabilities,
  tags,
  setTags,
}: {
  tags: string;
  setTags: (text: string) => void;
  capabilities: string[];
  setCapabilities: (values: string[]) => void;
  action: ScheduleAction;
  onChange: (action: ScheduleAction) => void;
  connectors: Connector[];
  headers: string;
  setHeaders: (text: string) => void;
  params: string;
  setParams: (text: string) => void;
}) {
  const { lang, t } = useLang();
  const { agents } = useAgents();
  switch (action.type) {
    case "publish_task":
      return (
        <>
          <p className="text-secondary text-text-2">{t("schedules.templateHint")}</p>
          <Field
            label={t("common.title")}
            required
            value={action.template.title}
            onChange={(event) =>
              onChange({ ...action, template: { ...action.template, title: event.target.value } })
            }
          />
          <Field
            label={t("common.body")}
            multiline
            rows={3}
            value={action.template.body ?? ""}
            onChange={(event) =>
              onChange({ ...action, template: { ...action.template, body: event.target.value } })
            }
          />
          <CapabilityPicker
            label={t("common.capabilities")}
            value={capabilities}
            onChange={setCapabilities}
            agents={agents}
            mode="multi"
            description={t("capability.description")}
          />
          <ClaimableHint capabilities={capabilities} agents={agents} />
          <Field
            label={t("common.tags")}
            placeholder={t("common.listSeparator")}
            value={tags}
            onChange={(event) => setTags(event.target.value)}
          />
          <p className="text-secondary text-text-2">{t("capability.tagsDescription")}</p>
          <Segmented
            label={t("common.priority")}
            value={action.template.priority ?? "normal"}
            options={TASK_PRIORITIES.map((value) => ({
              value,
              label: labels(lang).priority[value],
            }))}
            onChange={(priority) =>
              onChange({ ...action, template: { ...action.template, priority } })
            }
          />
        </>
      );
    case "http":
      return (
        <>
          <Segmented
            label={t("schedules.method")}
            value={action.method}
            options={["GET", "POST", "PUT", "PATCH", "DELETE"].map((value) => ({
              value: value as typeof action.method,
              label: value,
            }))}
            onChange={(method) => onChange({ ...action, method })}
          />
          <Field
            label="URL"
            required
            value={action.url}
            placeholder="https://"
            onChange={(event) => onChange({ ...action, url: event.target.value })}
          />
          <Field
            label={t("schedules.headers")}
            multiline
            rows={3}
            placeholder="Key: Value"
            value={headers}
            onChange={(event) => setHeaders(event.target.value)}
          />
          {action.method !== "GET" && (
            <Field
              label={t("schedules.requestBody")}
              multiline
              rows={3}
              value={action.body ?? ""}
              onChange={(event) => onChange({ ...action, body: event.target.value })}
            />
          )}
        </>
      );
    case "connector_trigger":
      return (
        <>
          <label className="block space-y-2 text-secondary text-text-2">
            <span>{t("common.connectors")}</span>
            <select
              className="w-full rounded-control border border-line bg-surface-2 px-3 py-2 text-body text-text focus:outline-accent"
              value={action.connectorId}
              onChange={(event) => onChange({ ...action, connectorId: event.target.value })}
            >
              {!connectors.some((connector) => connector.id === action.connectorId) && (
                <option value={action.connectorId} disabled>
                  {t("schedules.triggerUnsupported")}
                </option>
              )}
              {connectors.map((connector) => (
                <option key={connector.id} value={connector.id}>
                  {connector.name}
                </option>
              ))}
            </select>
          </label>
          <Field
            label={t("schedules.workflowId")}
            required
            value={action.jobExternalId}
            onChange={(event) => onChange({ ...action, jobExternalId: event.target.value })}
          />
          <Field
            label={t("schedules.parameters")}
            multiline
            rows={3}
            placeholder="key=value"
            value={params}
            onChange={(event) => setParams(event.target.value)}
          />
        </>
      );
  }
}
