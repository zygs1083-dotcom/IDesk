import { labels } from "@idesk/shared/labels";
import { TASK_PRIORITIES, type TaskPriority } from "@idesk/shared/task-status";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Button } from "../../components/button.tsx";
import { CapabilityPicker } from "../../components/capability-picker.tsx";
import { ClaimableHint } from "../../components/claimable-hint.tsx";
import { Dialog } from "../../components/dialog.tsx";
import { Field } from "../../components/field.tsx";
import { Menu } from "../../components/menu.tsx";
import { Segmented } from "../../components/segmented.tsx";
import { useLang } from "../../i18n/lang.tsx";
import { request } from "../../lib/api.ts";
import { useAgents } from "../../lib/use-agents.ts";
import type { Schedule } from "../schedules/types.ts";
import { DispatchFields } from "./dispatch-fields.tsx";

export function PublishDialog({ onClose }: { onClose: () => void }) {
  const { lang, t } = useLang();
  const [dueAt, setDueAt] = useState("");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [capabilities, setCapabilities] = useState<string[]>([]);
  const { agents } = useAgents();
  const [tags, setTags] = useState("");
  const { data: schedules } = useQuery({
    queryKey: ["schedules"],
    queryFn: () => request<Schedule[]>("/schedules"),
  });
  const templates =
    schedules?.flatMap((schedule) =>
      schedule.action.type === "publish_task"
        ? [{ name: schedule.name, template: schedule.action.template }]
        : [],
    ) ?? [];
  const [priority, setPriority] = useState<TaskPriority>("normal");
  const [mode, setMode] = useState<"open" | "assign" | "recruit">("open");
  const [agentId, setAgentId] = useState("");
  const [needed, setNeeded] = useState(2);
  const dispatch =
    mode === "assign"
      ? { type: mode, agentId }
      : mode === "recruit"
        ? { type: mode, needed }
        : undefined;
  const enabled = mode === "assign" ? !!agentId : mode === "recruit" ? needed >= 2 : true;
  const client = useQueryClient();
  const mutation = useMutation({
    mutationFn: () =>
      request("/tasks", {
        method: "POST",
        body: JSON.stringify({
          title: title.trim(),
          body,
          capabilities,
          ...(dueAt ? { dueAt: new Date(dueAt).toISOString() } : {}),
          priority,
          ...(dispatch === undefined ? {} : { dispatch }),
          tags: tags.split(/[,，\s]+/).filter(Boolean),
        }),
      }),
    onError: (error) => {
      if ("status" in error && error.status === 409)
        void client.invalidateQueries({ queryKey: ["tasks"] });
    },
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: ["tasks"] });
      onClose();
    },
  });
  return (
    <Dialog
      open
      onClose={onClose}
      title={t("common.publishTask")}
      footer={
        <>
          <Button onClick={onClose}>{t("common.cancel")}</Button>
          <Button
            type="submit"
            form="publish-task-form"
            variant="primary"
            disabled={!title.trim() || !enabled || mutation.isPending}
          >
            {t("common.publish")}
          </Button>
        </>
      }
      actions={
        templates.length > 0 && (
          <Menu
            label={t("desk.templates")}
            trigger={t("desk.templates")}
            items={templates.map(({ name, template }) => ({
              label: name,
              onSelect: () => {
                setTitle(template.title);
                setBody(template.body ?? "");
                setPriority(template.priority ?? "normal");
                setTags((template.tags ?? []).join(" "));
                setCapabilities(template.capabilities ?? []);
              },
            }))}
          />
        )
      }
    >
      <form
        id="publish-task-form"
        data-ui="publish-form"
        className="space-y-4"
        onSubmit={(event) => {
          event.preventDefault();
          mutation.mutate();
        }}
      >
        <Field
          label={t("common.title")}
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          autoFocus
          required
        />
        <Field
          multiline
          label={t("common.body")}
          rows={6}
          placeholder="Markdown"
          value={body}
          onChange={(event) => setBody(event.target.value)}
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
        <div className="space-y-2">
          <span className="pixel-legacy text-secondary text-text-2">{t("common.priority")}</span>
          <Segmented
            formField
            label={t("common.priority")}
            value={priority}
            onChange={setPriority}
            options={TASK_PRIORITIES.map((value) => ({
              value,
              label: labels(lang).priority[value],
            }))}
          />
        </div>
        <Field
          type="datetime-local"
          label={t("desk.dueAtOptional")}
          value={dueAt}
          onChange={(event) => setDueAt(event.target.value)}
        />
        <DispatchFields
          capabilities={capabilities}
          mode={mode}
          onModeChange={setMode}
          agentId={agentId}
          onAgentChange={setAgentId}
          needed={needed}
          onNeededChange={setNeeded}
        />
        {mutation.error && (
          <p role="alert" className="text-secondary text-status-failed">
            {mutation.error.message}
          </p>
        )}
        <div className="pixel-legacy flex justify-end">
          <Button
            type="submit"
            variant="primary"
            disabled={!title.trim() || !enabled || mutation.isPending}
          >
            {t("common.publish")}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
