import type { bindCodeSchema, Person } from "@idesk/shared/people-schemas";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import type { z } from "zod";
import { Button } from "../../components/button.tsx";
import { Dialog } from "../../components/dialog.tsx";
import { EmptyState } from "../../components/empty-state.tsx";
import { useLang } from "../../i18n/lang.tsx";
import { request } from "../../lib/api.ts";
import { usePeople } from "../../lib/use-people.ts";
import { useSession } from "../../lib/use-session.ts";
import { BindCodeDialog } from "./bind-code-dialog.tsx";
import { PersonDialog } from "./person-dialog.tsx";
import { PersonRow } from "./person-row.tsx";

export function PeoplePage() {
  const { t } = useLang();
  const { isAdmin } = useSession();
  const people = usePeople();
  const client = useQueryClient();
  const [editing, setEditing] = useState<{ person?: Person; field?: "name" | "role" } | null>(null);
  const [deleting, setDeleting] = useState<Person | null>(null);
  const [binding, setBinding] = useState(false);
  const remove = useMutation({
    mutationFn: (person: Person) => request(`/people/${person.id}`, { method: "DELETE" }),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: ["people"] });
      setDeleting(null);
    },
  });
  const unbind = useMutation({
    mutationFn: ({ personId, bindingId }: { personId: string; bindingId: string }) =>
      request(`/people/${personId}/bindings/${bindingId}`, { method: "DELETE" }),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: ["people"] });
    },
  });
  const bind = useMutation({
    mutationFn: (person: Person) =>
      request<z.infer<typeof bindCodeSchema>>(`/people/${person.id}/bind-code`, { method: "POST" }),
  });
  return (
    <section aria-label={t("settings.people")} className="min-w-0 space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h2 data-ui="fixed-label" className="text-section">
          {t("settings.people")}
        </h2>
        {isAdmin && (
          <Button variant="primary" onClick={() => setEditing({})}>
            {t("people.add")}
          </Button>
        )}
      </div>
      {people.isPending && (
        <p role="status" className="text-secondary text-text-2">
          {t("common.loading")}
        </p>
      )}
      {(people.error || unbind.error) && (
        <p role="alert" className="text-secondary text-status-failed">
          {(people.error ?? unbind.error)?.message}
        </p>
      )}
      {people.data?.length === 0 && (
        <EmptyState
          title={t("people.empty")}
          description={t("people.emptyDescription")}
          scene="folder"
          action={
            isAdmin ? { label: t("people.addOne"), onClick: () => setEditing({}) } : undefined
          }
        />
      )}
      {!!people.data?.length && (
        <div
          data-ui="panel"
          className="max-w-full overflow-x-auto rounded-panel border border-line bg-surface"
        >
          <table className="w-full min-w-140 border-collapse text-left">
            <thead data-ui="fixed-label" className="text-secondary text-text-2">
              <tr>
                <th scope="col" className="px-4 py-3 font-normal">
                  {t("common.name")}
                </th>
                <th scope="col" className="px-4 py-3 font-normal">
                  {t("people.role")}
                </th>
                <th scope="col" className="px-4 py-3 font-normal">
                  {t("people.channels")}
                </th>
                {isAdmin && (
                  <th scope="col" className="px-2 py-3 font-normal">
                    <span className="sr-only">{t("common.action")}</span>
                  </th>
                )}
              </tr>
            </thead>
            <tbody>
              {people.data.map((person) => (
                <PersonRow
                  key={person.id}
                  person={person}
                  admin={isAdmin}
                  busy={unbind.isPending}
                  onEdit={(field) => setEditing({ person, field })}
                  onBind={() => {
                    bind.reset();
                    setBinding(true);
                    bind.mutate(person);
                  }}
                  onUnbind={(bindingId) => unbind.mutate({ personId: person.id, bindingId })}
                  onDelete={() => {
                    remove.reset();
                    setDeleting(person);
                  }}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
      {isAdmin && editing && <PersonDialog {...editing} onClose={() => setEditing(null)} />}
      {isAdmin && binding && (
        <BindCodeDialog code={bind.data} error={bind.error} onClose={() => setBinding(false)} />
      )}
      {isAdmin && deleting && (
        <Dialog
          open
          title={t("people.deleteNamed", { name: deleting.name })}
          onClose={() => setDeleting(null)}
          footer={
            <>
              <Button onClick={() => setDeleting(null)}>{t("common.cancel")}</Button>
              <Button
                variant="danger"
                disabled={remove.isPending}
                onClick={() => remove.mutate(deleting)}
              >
                {t("common.delete")}
              </Button>
            </>
          }
        >
          <p className="text-body">{t("people.deleteWarning")}</p>
          {remove.error && (
            <p role="alert" className="mt-3 text-secondary text-status-failed">
              {remove.error.message}
            </p>
          )}
          <div className="pixel-legacy mt-4 flex justify-end gap-2">
            <Button onClick={() => setDeleting(null)}>{t("common.cancel")}</Button>
            <Button
              variant="danger"
              disabled={remove.isPending}
              onClick={() => remove.mutate(deleting)}
            >
              {t("common.delete")}
            </Button>
          </div>
        </Dialog>
      )}
    </section>
  );
}
