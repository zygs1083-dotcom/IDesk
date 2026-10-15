import { labels } from "@idesk/shared/labels";
import { TASK_PRIORITIES, type TaskPriority } from "@idesk/shared/task-status";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Button } from "../../components/button.tsx";
import { Dialog } from "../../components/dialog.tsx";
import { Field } from "../../components/field.tsx";
import { Menu } from "../../components/menu.tsx";
import { Segmented } from "../../components/segmented.tsx";
import { useLang } from "../../i18n/lang.tsx";
import { request } from "../../lib/api.ts";
import type { Schedule } from "../schedules/types.ts";

export function PublishDialog({ onClose }: { onClose: () => void }) {
  const { lang, t } = useLang();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [capabilities, setCapabilities] = useState("");
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
  const client = useQueryClient();
  const mutation = useMutation({
    mutationFn: () =>
      request("/tasks", {
        method: "POST",
        body: JSON.stringify({
          title: title.trim(),
          body,
          capabilities: capabilities.split(/[,，\s]+/).filter(Boolean),
          priority,
          tags: tags.split(/[,，\s]+/).filter(Boolean),
        }),
      }),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: ["tasks"] });
      onClose();
    },
  });
  return (
    <Dialog
      open
      onClose={onClose}
      title={t("desk.publishTask")}
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
                setCapabilities((template.capabilities ?? []).join(" "));
              },
            }))}
          />
        )
      }
    >
      <form
        className="space-y-4"
        onSubmit={(event) => {
          event.preventDefault();
          mutation.mutate();
        }}
      >
        <Field
          label={t("desk.title")}
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          autoFocus
          required
        />
        <Field
          multiline
          label={t("desk.body")}
          rows={6}
          placeholder="Markdown"
          value={body}
          onChange={(event) => setBody(event.target.value)}
        />
        <Field
          label={t("desk.capabilities")}
          placeholder="coding, browser"
          value={capabilities}
          onChange={(event) => setCapabilities(event.target.value)}
        />
        <Field
          label={t("desk.tags")}
          placeholder={t("desk.separateWithSpacesOrCommas")}
          value={tags}
          onChange={(event) => setTags(event.target.value)}
        />
        <div className="space-y-2">
          <span className="text-secondary text-text-2">{t("desk.priority")}</span>
          <Segmented
            label={t("desk.priority")}
            value={priority}
            onChange={setPriority}
            options={TASK_PRIORITIES.map((value) => ({
              value,
              label: labels(lang).priority[value],
            }))}
          />
        </div>
        {mutation.error && (
          <p role="alert" className="text-secondary text-status-failed">
            {mutation.error.message}
          </p>
        )}
        <div className="flex justify-end">
          <Button type="submit" variant="primary" disabled={!title.trim() || mutation.isPending}>
            {t("desk.publish")}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
