import { labels } from "@idesk/shared/labels";
import { TASK_PRIORITIES } from "@idesk/shared/task-status";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Button } from "../../components/button.tsx";
import { CapabilityPicker } from "../../components/capability-picker.tsx";
import { Dialog } from "../../components/dialog.tsx";
import { Field } from "../../components/field.tsx";
import { Segmented } from "../../components/segmented.tsx";
import { useLang } from "../../i18n/lang.tsx";
import { request } from "../../lib/api.ts";
import type { Task } from "../../lib/types.ts";
import { useAgents } from "../../lib/use-agents.ts";
import { useSession } from "../../lib/use-session.ts";
import { localDateTime } from "./local-date-time.ts";

export function EditTaskDialog({ task, onClose }: { task: Task; onClose: () => void }) {
  const { lang, t } = useLang();
  const { isAdmin } = useSession();
  const { agents } = useAgents();
  const client = useQueryClient();
  const [title, setTitle] = useState(task.title);
  const [body, setBody] = useState(task.body);
  const [priority, setPriority] = useState(task.priority);
  const [tags, setTags] = useState(task.tags.join(" "));
  const [capabilities, setCapabilities] = useState(task.capabilities);
  const [dueAt, setDueAt] = useState(() => localDateTime(task.dueAt));
  const save = useMutation({
    mutationFn: () =>
      request<Task>(`/tasks/${task.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          title: title.trim(),
          body,
          priority,
          capabilities,
          tags: tags.split(/[,，\s]+/).filter(Boolean),
          dueAt: dueAt ? new Date(dueAt).toISOString() : null,
        }),
      }),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: ["tasks"] });
      void client.invalidateQueries({ queryKey: ["task", task.id] });
      onClose();
    },
  });
  return (
    <Dialog
      open
      onClose={onClose}
      title={t("common.edit")}
      footer={
        <>
          <Button onClick={onClose}>{t("common.cancel")}</Button>
          <Button
            type="submit"
            form="edit-task-form"
            variant="primary"
            disabled={!isAdmin || !title.trim() || save.isPending}
          >
            {t("common.save")}
          </Button>
        </>
      }
    >
      <form
        id="edit-task-form"
        className="space-y-4"
        onSubmit={(event) => {
          event.preventDefault();
          if (isAdmin) save.mutate();
        }}
      >
        <Field
          label={t("common.title")}
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          required
          autoFocus
        />
        <Field
          multiline
          rows={5}
          label={t("common.body")}
          value={body}
          onChange={(event) => setBody(event.target.value)}
        />
        <CapabilityPicker
          label={t("common.capabilities")}
          value={capabilities}
          onChange={setCapabilities}
          agents={agents}
          mode="multi"
        />
        <Field
          label={t("common.tags")}
          value={tags}
          onChange={(event) => setTags(event.target.value)}
        />
        <div className="space-y-2">
          <p className="text-secondary text-text-2">{t("common.priority")}</p>
          <Segmented
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
          step="0.001"
          label={t("desk.dueAtOptional")}
          value={dueAt}
          onChange={(event) => setDueAt(event.target.value)}
        />
        {save.error && (
          <p role="alert" className="text-secondary text-status-failed">
            {save.error.message}
          </p>
        )}
        <div className="pixel-legacy flex justify-end gap-2">
          <Button onClick={onClose}>{t("common.cancel")}</Button>
          <Button
            type="submit"
            variant="primary"
            disabled={!isAdmin || !title.trim() || save.isPending}
          >
            {t("common.save")}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
