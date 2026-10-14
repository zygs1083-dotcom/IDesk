import type { ScheduleAction } from "@idesk/shared/schedule-schemas";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Button } from "../../components/button.tsx";
import { Dialog } from "../../components/dialog.tsx";
import { Field } from "../../components/field.tsx";
import { Segmented } from "../../components/segmented.tsx";
import { Switch } from "../../components/switch.tsx";
import { request } from "../../lib/api.ts";
import { ActionFields } from "./action-fields.tsx";
import { cronText } from "./cron-text.ts";
import { entriesText, parseEntries } from "./entry-text.ts";
import type { Connector, Schedule, ScheduleInput } from "./types.ts";

export function ScheduleDialog({
  schedule,
  connectors,
  onClose,
}: {
  schedule?: Schedule;
  connectors: Connector[];
  onClose: () => void;
}) {
  const client = useQueryClient();
  const [name, setName] = useState(schedule?.name ?? "");
  const [cron, setCron] = useState(schedule?.cron ?? "");
  const [timezone, setTimezone] = useState(schedule?.timezone ?? "Asia/Shanghai");
  const [enabled, setEnabled] = useState(schedule?.enabled ?? true);
  const [action, setAction] = useState<ScheduleAction>(
    schedule?.action ?? { type: "publish_task", template: { title: "", priority: "normal" } },
  );
  const [headers, setHeaders] = useState(
    schedule?.action.type === "http" ? entriesText(schedule.action.headers, ":") : "",
  );
  const [params, setParams] = useState(
    schedule?.action.type === "connector_trigger"
      ? entriesText(schedule.action.params ?? {}, "=")
      : "",
  );
  const [capabilities, setCapabilities] = useState(
    schedule?.action.type === "publish_task"
      ? (schedule.action.template.capabilities ?? []).join(" ")
      : "",
  );
  const triggerConnectors = connectors.filter((connector) => connector.canTrigger);
  const firstTrigger = triggerConnectors[0];
  const options: { value: ScheduleAction["type"]; label: string }[] = [
    { value: "publish_task", label: "发布任务" },
    { value: "http", label: "HTTP 请求" },
  ];
  if (firstTrigger) options.push({ value: "connector_trigger", label: "触发连接器" });
  const ready =
    !!name.trim() &&
    !!cron.trim() &&
    !!timezone.trim() &&
    (action.type === "publish_task"
      ? !!action.template.title.trim()
      : action.type === "http"
        ? !!action.url.trim()
        : !!action.jobExternalId.trim() &&
          triggerConnectors.some((connector) => connector.id === action.connectorId));
  const save = useMutation({
    mutationFn: () => {
      const input: ScheduleInput = {
        name: name.trim(),
        cron: cron.trim(),
        timezone: timezone.trim(),
        enabled,
        action,
      };
      if (action.type === "http") {
        input.action = { ...action, headers: parseEntries(headers, ":") };
        if (input.action.method === "GET") delete input.action.body;
      }
      if (action.type === "connector_trigger")
        input.action = { ...action, params: parseEntries(params, "=") };
      if (action.type === "publish_task")
        input.action = {
          ...action,
          template: {
            ...action.template,
            capabilities: capabilities.split(/[\s,，]+/).filter(Boolean),
          },
        };
      return request<Schedule>(schedule ? `/schedules/${schedule.id}` : "/schedules", {
        method: schedule ? "PATCH" : "POST",
        body: JSON.stringify(input),
      });
    },
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: ["schedules"] });
      onClose();
    },
  });
  return (
    <Dialog open title={schedule ? "编辑定时" : "新建定时"} onClose={onClose}>
      <form
        noValidate
        className="space-y-4"
        onSubmit={(event) => {
          event.preventDefault();
          if (ready && !save.isPending) save.mutate();
        }}
      >
        <Field
          label="名称"
          required
          value={name}
          onChange={(event) => setName(event.target.value)}
        />
        <div className="space-y-2">
          <Field
            label="cron"
            required
            value={cron}
            placeholder="0 9 * * *"
            onChange={(event) => setCron(event.target.value)}
          />
          <p aria-live="polite" className="text-secondary text-text-2">
            {cron ? cronText(cron) : "填写 cron 表达式"}
          </p>
        </div>
        <div className="flex items-end gap-4">
          <div className="min-w-0 flex-1">
            <Field
              label="时区"
              value={timezone}
              onChange={(event) => setTimezone(event.target.value)}
            />
          </div>
          <div className="flex items-center gap-2 pb-2">
            <span className="text-secondary text-text-2">启用</span>
            <Switch label="启用" checked={enabled} onChange={setEnabled} />
          </div>
        </div>
        <Segmented
          label="动作"
          options={options}
          value={action.type}
          onChange={(type) => {
            switch (type) {
              case "publish_task":
                setAction({ type, template: { title: "", priority: "normal" } });
                break;
              case "http":
                setAction({ type, method: "GET", url: "", headers: {} });
                break;
              case "connector_trigger":
                if (firstTrigger)
                  setAction({
                    type,
                    connectorId: firstTrigger.id,
                    jobExternalId: "",
                    params: {},
                  });
                break;
            }
          }}
        />
        <ActionFields
          action={action}
          onChange={setAction}
          connectors={triggerConnectors}
          headers={headers}
          setHeaders={setHeaders}
          params={params}
          setParams={setParams}
          capabilities={capabilities}
          setCapabilities={setCapabilities}
        />
        {save.error && (
          <p role="alert" className="text-secondary text-status-failed">
            {save.error.message}
          </p>
        )}
        <div className="flex justify-end gap-2">
          <Button onClick={onClose}>取消</Button>
          <Button type="submit" variant="primary" disabled={!ready || save.isPending}>
            {save.isPending ? "保存中…" : schedule ? "保存" : "新建"}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
