import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Button } from "../../components/button.tsx";
import { Field } from "../../components/field.tsx";
import { useLang } from "../../i18n/lang.tsx";
import { request } from "../../lib/api.ts";
import type { Task } from "../../lib/types.ts";

export function TaskPicker({ value, onChange }: { value: string; onChange: (id: string) => void }) {
  const { t } = useLang();
  const [search, setSearch] = useState("");
  const {
    data: tasks = [],
    error,
    isPending,
  } = useQuery({
    queryKey: ["tasks", "relay-search", search],
    queryFn: () => request<Task[]>(`/tasks?q=${encodeURIComponent(search.trim())}`),
    enabled: search.trim().length > 0,
  });
  const { data: selected } = useQuery({
    queryKey: ["task", value],
    queryFn: () => request<Task>(`/tasks/${encodeURIComponent(value)}`),
    enabled: Boolean(value),
  });
  const matches = search.trim() ? tasks.slice(0, 10) : [];
  return (
    <div className="space-y-2">
      <Field
        label={t("relay.taskOptional")}
        placeholder={t("relay.taskSearch")}
        value={search}
        onChange={(event) => {
          setSearch(event.target.value);
          onChange("");
        }}
      />
      {value && (
        <p className="text-secondary">
          {selected?.title ?? value}{" "}
          <Button
            onClick={() => {
              onChange("");
              setSearch("");
            }}
          >
            {t("relay.clearTask")}
          </Button>
        </p>
      )}
      {error && (
        <p role="alert" className="text-status-failed">
          {error.message}
        </p>
      )}
      {search && !isPending && !error && matches.length === 0 && (
        <p className="text-secondary text-text-2">{t("relay.noTasks")}</p>
      )}
      {matches.length > 0 && (
        <ul className="max-h-48 overflow-y-auto rounded-control border border-line">
          {matches.map((task) => (
            <li key={task.id}>
              <button
                type="button"
                className="w-full px-3 py-2 text-left text-secondary hover:bg-surface-2"
                onClick={() => {
                  onChange(task.id);
                  setSearch("");
                }}
              >
                {task.title} <span className="text-label text-text-2">{task.id}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
