import { TASK_PRIORITIES, type TaskPriority } from "@idesk/shared/task-status";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Button } from "../../components/button.tsx";
import { Dialog } from "../../components/dialog.tsx";
import { Field } from "../../components/field.tsx";
import { Segmented } from "../../components/segmented.tsx";
import { request } from "../../lib/api.ts";

const priorityLabels = { low: "低", normal: "普通", high: "高", urgent: "紧急" };
export function PublishDialog({ onClose }: { onClose: () => void }) {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [capabilities, setCapabilities] = useState("");
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
        }),
      }),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: ["tasks"] });
      onClose();
    },
  });
  return (
    <Dialog open onClose={onClose} title="发布任务">
      <form
        className="space-y-4"
        onSubmit={(event) => {
          event.preventDefault();
          mutation.mutate();
        }}
      >
        <Field
          label="标题"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          autoFocus
          required
        />
        <Field
          multiline
          label="正文"
          rows={6}
          placeholder="Markdown"
          value={body}
          onChange={(event) => setBody(event.target.value)}
        />
        <Field
          label="能力"
          placeholder="coding, browser"
          value={capabilities}
          onChange={(event) => setCapabilities(event.target.value)}
        />
        <div className="space-y-2">
          <span className="text-secondary text-text-2">优先级</span>
          <Segmented
            label="优先级"
            value={priority}
            onChange={setPriority}
            options={TASK_PRIORITIES.map((value) => ({ value, label: priorityLabels[value] }))}
          />
        </div>
        {mutation.error && (
          <p role="alert" className="text-secondary text-status-failed">
            {mutation.error.message}
          </p>
        )}
        <div className="flex justify-end">
          <Button type="submit" variant="primary" disabled={!title.trim() || mutation.isPending}>
            发布
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
