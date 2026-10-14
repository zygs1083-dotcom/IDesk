import { type TaskAction, TransitionError } from "@idesk/shared/task-machine";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { request } from "../../lib/api.ts";
import { previewAction } from "./drop-action.ts";
import type { Task } from "./types.ts";

export function useTaskAction(onSuccess: () => void) {
  const client = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const mutation = useMutation({
    mutationFn: ({ task, action }: { task: Task; action: TaskAction }) =>
      request<Task>(`/tasks/${task.id}/actions/${action.type}`, {
        method: "POST",
        body: JSON.stringify(action),
      }),
    onMutate: async ({ task, action }) => {
      setError(null);
      await client.cancelQueries({ queryKey: ["tasks"] });
      await client.cancelQueries({ queryKey: ["task", task.id] });
      const previous = client.getQueryData<Task[]>(["tasks"]);
      const detail = client.getQueryData<Task>(["task", task.id]);
      const next = previewAction(task, action, new Date());
      if (!(next instanceof TransitionError)) {
        client.setQueryData<Task[]>(["tasks"], (tasks) =>
          tasks?.map((item) => (item.id === task.id ? next : item)),
        );
        client.setQueryData(["task", task.id], next);
      }
      return { previous, detail };
    },
    onError: (error, { task }, context) => {
      if (context?.previous) client.setQueryData(["tasks"], context.previous);
      if (context?.detail) client.setQueryData(["task", task.id], context.detail);
      setError(error.message);
    },
    onSuccess,
    onSettled: (_, __, { task }) => {
      void client.invalidateQueries({ queryKey: ["tasks"] });
      void client.invalidateQueries({ queryKey: ["task", task.id] });
    },
  });
  return { mutation, error, setError };
}
