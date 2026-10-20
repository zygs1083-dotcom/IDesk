import type { Person, PersonRole } from "@idesk/shared/people-schemas";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Button } from "../../components/button.tsx";
import { Dialog } from "../../components/dialog.tsx";
import { Field } from "../../components/field.tsx";
import { Segmented } from "../../components/segmented.tsx";
import { useLang } from "../../i18n/lang.tsx";
import { request } from "../../lib/api.ts";

export function PersonDialog({
  person,
  field,
  onClose,
}: {
  person?: Person;
  field?: "name" | "role";
  onClose: () => void;
}) {
  const { t } = useLang();
  const client = useQueryClient();
  const [name, setName] = useState(person?.name ?? "");
  const [role, setRole] = useState<PersonRole>(person?.role ?? "member");
  const save = useMutation({
    mutationFn: () =>
      request<Person>(person ? `/people/${person.id}` : "/people", {
        method: person ? "PATCH" : "POST",
        body: JSON.stringify(
          field === "name"
            ? { name: name.trim() }
            : field === "role"
              ? { role }
              : { name: name.trim(), role },
        ),
      }),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: ["people"] });
      onClose();
    },
  });
  return (
    <Dialog
      open
      title={t(person ? (field === "name" ? "people.rename" : "people.changeRole") : "people.add")}
      onClose={onClose}
      footer={
        <>
          <Button onClick={onClose}>{t("common.cancel")}</Button>
          <Button
            type="submit"
            form="person-form"
            variant="primary"
            disabled={!name.trim() || save.isPending}
          >
            {t("common.save")}
          </Button>
        </>
      }
    >
      <form
        id="person-form"
        className="space-y-4"
        onSubmit={(event) => {
          event.preventDefault();
          save.mutate();
        }}
      >
        {field !== "role" && (
          <Field
            label={t("common.name")}
            value={name}
            maxLength={20}
            required
            autoFocus
            onChange={(event) => setName(event.target.value)}
          />
        )}
        {field !== "name" && (
          <Segmented
            formField
            label={t("people.role")}
            value={role}
            onChange={setRole}
            options={[
              { value: "member", label: t("people.member") },
              { value: "viewer", label: t("people.viewer") },
            ]}
          />
        )}
        {save.error && (
          <p role="alert" className="text-secondary text-status-failed">
            {save.error.message}
          </p>
        )}
        <div className="pixel-legacy flex justify-end gap-2">
          <Button onClick={onClose}>{t("common.cancel")}</Button>
          <Button type="submit" variant="primary" disabled={!name.trim() || save.isPending}>
            {t("common.save")}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
