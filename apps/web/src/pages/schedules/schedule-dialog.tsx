import type { ScheduleAction } from "@idesk/shared/schedule-schemas";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Button } from "../../components/button.tsx";
import { Dialog } from "../../components/dialog.tsx";
import { Field } from "../../components/field.tsx";
import { Switch } from "../../components/switch.tsx";
import { useLang } from "../../i18n/lang.tsx";
import { request } from "../../lib/api.ts";
import { ActionFields } from "./action-fields.tsx";
import { ActionTabs } from "./action-tabs.tsx";
import { cronText } from "./cron-text.ts";
import { entriesText, parseEntries } from "./entry-text.ts";
import { SchedulePreview } from "./schedule-preview.tsx";
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
  const { lang, t } = useLang();
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
    schedule?.action.type === "publish_task" ? (schedule.action.template.capabilities ?? []) : [],
  );
  const [tags, setTags] = useState(
    schedule?.action.type === "publish_task" ? (schedule.action.template.tags ?? []).join(" ") : "",
  );
  const triggerConnectors = connectors.filter((connector) => connector.canTrigger);
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
            capabilities,
            tags: tags.split(/[\s,，]+/).filter(Boolean),
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
    <Dialog
      open
      title={schedule ? t("schedules.edit") : t("schedules.create")}
      onClose={onClose}
      footer={
        <>
          <Button onClick={onClose}>{t("common.cancel")}</Button>
          <Button
            type="submit"
            form="schedule-form"
            variant="primary"
            disabled={!ready || save.isPending}
          >
            {save.isPending ? t("common.saving") : schedule ? t("common.save") : t("common.create")}
          </Button>
        </>
      }
    >
      <form
        id="schedule-form"
        noValidate
        className="space-y-4"
        onSubmit={(event) => {
          event.preventDefault();
          if (ready && !save.isPending) save.mutate();
        }}
      >
        <Field
          label={t("common.name")}
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
            {cron ? cronText(cron, lang) : t("schedules.cronPlaceholder")}
          </p>
          <SchedulePreview cron={cron} timezone={timezone} enabled={enabled} lang={lang} t={t} />
        </div>
        <div className="flex items-end gap-4">
          <div className="min-w-0 flex-1">
            <Field
              label={t("schedules.timeZone")}
              value={timezone}
              onChange={(event) => setTimezone(event.target.value)}
            />
          </div>
          <div data-ui="form-switch" className="flex items-center gap-2 pb-2">
            <span className="text-secondary text-text-2">{t("common.enable")}</span>
            <Switch label={t("common.enable")} checked={enabled} onChange={setEnabled} />
          </div>
        </div>
        <ActionTabs action={action} onChange={setAction} connectors={triggerConnectors} />
        {schedule && action.type === "http" && (
          <p className="text-secondary text-text-2">{t("common.hiddenValuesHint")}</p>
        )}
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
          tags={tags}
          setTags={setTags}
        />
        {save.error && (
          <p role="alert" className="text-secondary text-status-failed">
            {save.error.message}
          </p>
        )}
        <div className="pixel-legacy flex justify-end gap-2">
          <Button onClick={onClose}>{t("common.cancel")}</Button>
          <Button type="submit" variant="primary" disabled={!ready || save.isPending}>
            {save.isPending ? t("common.saving") : schedule ? t("common.save") : t("common.create")}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
