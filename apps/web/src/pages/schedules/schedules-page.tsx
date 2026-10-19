import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Button } from "../../components/button.tsx";
import { Dialog } from "../../components/dialog.tsx";
import { EmptyState } from "../../components/empty-state.tsx";
import { Toast } from "../../components/toast.tsx";
import { useLang } from "../../i18n/lang.tsx";
import { PageHeader } from "../../layout/page-header.tsx";
import { request } from "../../lib/api.ts";
import { useSession } from "../../lib/use-session.ts";
import { useShortcut } from "../../lib/use-shortcut.ts";
import { ScheduleDialog } from "./schedule-dialog.tsx";
import { ScheduleHistory } from "./schedule-history.tsx";
import { ScheduleRow } from "./schedule-row.tsx";
import type { Connector, Schedule } from "./types.ts";

export function SchedulesPage() {
  const { t } = useLang();
  const { isAdmin: canEdit } = useSession();
  const [history, setHistory] = useState<Schedule | null>(null);
  const client = useQueryClient();
  const schedules = useQuery({
    queryKey: ["schedules"],
    queryFn: () => request<Schedule[]>("/schedules"),
  });
  const connectors = useQuery({
    queryKey: ["automation", "connectors"],
    queryFn: () => request<Connector[]>("/connectors"),
  });
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<Schedule | null>(null);
  const [deleting, setDeleting] = useState<Schedule | null>(null);
  const [pendingRuns, setPendingRuns] = useState<string[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const toggle = useMutation({
    mutationFn: ({ id, enabled }: { id: string; enabled: boolean }) =>
      request<Schedule>(`/schedules/${id}`, { method: "PATCH", body: JSON.stringify({ enabled }) }),
    onMutate: async ({ id, enabled }) => {
      await client.cancelQueries({ queryKey: ["schedules"] });
      const previous = client.getQueryData<Schedule[]>(["schedules"]);
      client.setQueryData<Schedule[]>(["schedules"], (rows) =>
        rows?.map((row) => (row.id === id ? { ...row, enabled } : row)),
      );
      return { previous };
    },
    onError: (error, _variables, context) => {
      if (context) client.setQueryData(["schedules"], context.previous);
      setMessage(error.message);
    },
    onSettled: () => client.invalidateQueries({ queryKey: ["schedules"] }),
  });
  const run = useMutation({
    mutationFn: (id: string) => request<Schedule>(`/schedules/${id}/run`, { method: "POST" }),
    onMutate: (id) => setPendingRuns((ids) => [...ids, id]),
    onSettled: (_data, _error, id) => {
      setPendingRuns((ids) => ids.filter((pending) => pending !== id));
      void client.invalidateQueries({ queryKey: ["schedules"] });
    },
    onSuccess: (result) => {
      setMessage(
        result.lastStatus === "success" ? t("schedules.runSucceeded") : t("schedules.runFailed"),
      );
    },
    onError: (error) => setMessage(error.message),
  });
  const remove = useMutation({
    mutationFn: (id: string) => request<void>(`/schedules/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      setDeleting(null);
      void client.invalidateQueries({ queryKey: ["schedules"] });
    },
    onError: (error) => setMessage(error.message),
  });
  useShortcut("n", () => {
    if (canEdit && connectors.data) setCreating(true);
  });
  const error = schedules.error ?? connectors.error;
  return (
    <div data-scene="schedules" className="space-y-6">
      <PageHeader title={t("nav.schedules")}>
        {canEdit && (
          <Button variant="primary" disabled={!connectors.data} onClick={() => setCreating(true)}>
            {t("common.create")}
          </Button>
        )}
      </PageHeader>
      {error && (
        <p role="alert" className="text-secondary text-status-failed">
          {error.message}
        </p>
      )}
      {schedules.isPending && <p className="text-secondary text-text-2">{t("common.loading")}</p>}
      {!error && schedules.data?.length === 0 && (
        <EmptyState
          title={t("schedules.empty")}
          description={t("empty.schedules")}
          scene="calendar"
          action={
            canEdit
              ? {
                  label: t("common.createOne"),
                  disabled: !connectors.data,
                  onClick: () => setCreating(true),
                }
              : undefined
          }
        />
      )}
      {!!schedules.data?.length && (
        <div
          data-ui="panel"
          className="overflow-x-auto rounded-panel border border-line bg-surface"
        >
          <table className="w-full text-left text-secondary">
            <thead className="border-b border-line text-label text-text-2">
              <tr>
                {[
                  t("common.name"),
                  t("schedules.frequency"),
                  t("common.action"),
                  t("schedules.lastRun"),
                  t("schedules.nextRun"),
                  t("common.enable"),
                  "",
                ].map((label) => (
                  <th key={label} scope="col" className="whitespace-nowrap px-4 py-3 font-medium">
                    {label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {schedules.data.map((schedule) => (
                <ScheduleRow
                  key={schedule.id}
                  schedule={schedule}
                  connectors={connectors.data ?? []}
                  busy={toggle.isPending || remove.isPending}
                  running={schedule.running || pendingRuns.includes(schedule.id)}
                  canEdit={canEdit}
                  onHistory={() => setHistory(schedule)}
                  onToggle={(enabled) => toggle.mutate({ id: schedule.id, enabled })}
                  onRun={() => run.mutate(schedule.id)}
                  onEdit={() => setEditing(schedule)}
                  onDelete={() => setDeleting(schedule)}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
      {creating && connectors.data && (
        <ScheduleDialog connectors={connectors.data} onClose={() => setCreating(false)} />
      )}
      {editing && connectors.data && (
        <ScheduleDialog
          schedule={editing}
          connectors={connectors.data}
          onClose={() => setEditing(null)}
        />
      )}
      <Dialog
        open={!!deleting}
        title={t("schedules.delete", { name: deleting?.name ?? "" })}
        onClose={() => setDeleting(null)}
        footer={
          <>
            <Button onClick={() => setDeleting(null)}>{t("common.cancel")}</Button>
            <Button
              variant="danger"
              disabled={remove.isPending}
              onClick={() => {
                if (deleting) remove.mutate(deleting.id);
              }}
            >
              {t("common.delete")}
            </Button>
          </>
        }
      >
        <div className="pixel-legacy flex justify-end gap-2">
          <Button onClick={() => setDeleting(null)}>{t("common.cancel")}</Button>
          <Button
            className="text-status-failed"
            disabled={remove.isPending}
            onClick={() => {
              if (deleting) remove.mutate(deleting.id);
            }}
          >
            {t("common.delete")}
          </Button>
        </div>
      </Dialog>
      {history && <ScheduleHistory schedule={history} onClose={() => setHistory(null)} />}
      <Toast message={message} onClose={() => setMessage(null)} />
    </div>
  );
}
