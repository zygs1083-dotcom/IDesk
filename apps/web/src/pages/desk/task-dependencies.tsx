import { useMutation, useQueries, useQueryClient } from "@tanstack/react-query";
import { X } from "lucide-react";
import { useState } from "react";
import { useSearchParams } from "react-router";
import { request } from "../../lib/api.ts";
import type { Task } from "../../lib/types.ts";
import { useTasks } from "../../lib/use-tasks.ts";
import { StatusDot } from "./status-dot.tsx";

export function TaskDependencies({
  task,
  onError,
}: {
  task: Task;
  onError: (message: string) => void;
}) {
  const client = useQueryClient();
  const { tasks } = useTasks();
  const [, setParams] = useSearchParams();
  const [search, setSearch] = useState<string | null>(null);
  const missing = task.blockedBy.filter((id) => !tasks.some((item) => item.id === id));
  const queries = useQueries({
    queries: missing.map((id) => ({
      queryKey: ["task", id],
      queryFn: () => request<Task>(`/tasks/${id}`),
    })),
  });
  const queryError = queries.find((query) => query.error)?.error;
  const mutation = useMutation({
    mutationFn: (blockedBy: string[]) =>
      request<Task>(`/tasks/${task.id}`, {
        method: "PATCH",
        body: JSON.stringify({ blockedBy }),
      }),
    onSuccess: () => {
      setSearch(null);
      void client.invalidateQueries({ queryKey: ["tasks"] });
      void client.invalidateQueries({ queryKey: ["task", task.id] });
    },
    onError: (error) => onError(error.message),
  });
  const candidates = tasks
    .filter(
      (item) =>
        item.id !== task.id &&
        !task.blockedBy.includes(item.id) &&
        item.title.toLocaleLowerCase().includes((search ?? "").toLocaleLowerCase()),
    )
    .slice(0, 8);
  return (
    <section className="space-y-3">
      <h3 className="text-section">依赖</h3>
      {queryError && (
        <p role="alert" className="text-secondary text-status-failed">
          {queryError.message}
        </p>
      )}
      {task.blockedBy.map((id) => {
        const dependency =
          tasks.find((item) => item.id === id) ?? queries[missing.indexOf(id)]?.data;
        return (
          dependency && (
            <div key={id} className="flex items-center gap-2 text-secondary">
              <StatusDot status={dependency.status} />
              <button
                type="button"
                className="min-w-0 flex-1 truncate text-left hover:text-accent focus-visible:outline-accent"
                onClick={() =>
                  setParams((params) => {
                    params.set("task", id);
                    return params;
                  })
                }
              >
                {dependency.title}
              </button>
              <button
                type="button"
                aria-label="移除依赖"
                disabled={mutation.isPending}
                className="rounded-control p-1 text-text-3 hover:text-text focus-visible:outline-accent disabled:opacity-50"
                onClick={() => mutation.mutate(task.blockedBy.filter((item) => item !== id))}
              >
                <X size={16} strokeWidth={1.5} aria-hidden="true" />
              </button>
            </div>
          )
        );
      })}
      {search === null ? (
        <button
          type="button"
          className="text-accent text-secondary focus-visible:outline-accent"
          onClick={() => setSearch("")}
        >
          添加依赖
        </button>
      ) : (
        <div className="space-y-2">
          <input
            aria-label="搜索依赖任务"
            ref={(input) => input?.focus()}
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Escape") {
                event.preventDefault();
                event.stopPropagation();
                setSearch(null);
              }
            }}
            placeholder="搜索任务标题"
            className="w-full rounded-control border border-line bg-surface px-3 py-2 text-secondary placeholder:text-text-3 focus:outline-2 focus:outline-accent"
          />
          <ul className="space-y-1">
            {candidates.map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  disabled={mutation.isPending}
                  className="w-full truncate rounded-control px-3 py-2 text-left text-secondary hover:bg-surface-2 focus-visible:outline-accent disabled:opacity-50"
                  onClick={() => mutation.mutate([...task.blockedBy, item.id])}
                >
                  {item.title}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
