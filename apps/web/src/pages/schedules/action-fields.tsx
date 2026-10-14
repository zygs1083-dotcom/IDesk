import type { ScheduleAction } from "@idesk/shared/schedule-schemas";
import { TASK_PRIORITIES, TASK_PRIORITY_LABEL } from "@idesk/shared/task-status";
import { Field } from "../../components/field.tsx";
import { Segmented } from "../../components/segmented.tsx";
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
  capabilities: string;
  setCapabilities: (text: string) => void;
  action: ScheduleAction;
  onChange: (action: ScheduleAction) => void;
  connectors: Connector[];
  headers: string;
  setHeaders: (text: string) => void;
  params: string;
  setParams: (text: string) => void;
}) {
  switch (action.type) {
    case "publish_task":
      return (
        <>
          <p className="text-secondary text-text-2">关闭开关的条目可在发布弹层当模板用</p>
          <Field
            label="标题"
            required
            value={action.template.title}
            onChange={(event) =>
              onChange({ ...action, template: { ...action.template, title: event.target.value } })
            }
          />
          <Field
            label="正文"
            multiline
            rows={3}
            value={action.template.body ?? ""}
            onChange={(event) =>
              onChange({ ...action, template: { ...action.template, body: event.target.value } })
            }
          />
          <Field
            label="能力"
            placeholder="空格或逗号分隔"
            value={capabilities}
            onChange={(event) => setCapabilities(event.target.value)}
          />
          <Field
            label="标签"
            placeholder="空格或逗号分隔"
            value={tags}
            onChange={(event) => setTags(event.target.value)}
          />
          <Segmented
            label="优先级"
            value={action.template.priority ?? "normal"}
            options={TASK_PRIORITIES.map((value) => ({ value, label: TASK_PRIORITY_LABEL[value] }))}
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
            label="方法"
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
            label="请求头"
            multiline
            rows={3}
            placeholder="Key: Value"
            value={headers}
            onChange={(event) => setHeaders(event.target.value)}
          />
          {action.method !== "GET" && (
            <Field
              label="请求体"
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
            <span>连接器</span>
            <select
              className="w-full rounded-control border border-line bg-surface-2 px-3 py-2 text-body text-text focus:outline-accent"
              value={action.connectorId}
              onChange={(event) => onChange({ ...action, connectorId: event.target.value })}
            >
              {!connectors.some((connector) => connector.id === action.connectorId) && (
                <option value={action.connectorId} disabled>
                  当前连接器不支持触发
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
            label="工作流 id"
            required
            value={action.jobExternalId}
            onChange={(event) => onChange({ ...action, jobExternalId: event.target.value })}
          />
          <Field
            label="参数"
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
