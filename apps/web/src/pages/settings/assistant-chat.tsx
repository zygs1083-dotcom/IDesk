import { useId, useState } from "react";
import { useLang } from "../../i18n/lang.tsx";
import { usePeople } from "../../lib/use-people.ts";
import { AssistantChatPanel } from "./assistant-chat-panel.tsx";

export function AssistantChat() {
  const { t } = useLang();
  const id = useId();
  const people = usePeople();
  const [selected, setSelected] = useState("");
  const person = people.data?.find((entry) => entry.id === selected) ?? people.data?.[0];
  return (
    <section aria-label={t("assistant.try")} className="min-w-0 space-y-3">
      <h3 data-ui="fixed-label" className="text-section">
        {t("assistant.try")}
      </h3>
      {people.error && (
        <p role="alert" className="text-secondary text-status-failed">
          {people.error.message}
        </p>
      )}
      {people.isPending && (
        <p role="status" className="text-secondary text-text-2">
          {t("common.loading")}
        </p>
      )}
      {people.data?.length === 0 && (
        <p data-ui="fixed-label" className="text-secondary text-text-2">
          {t("assistant.noPeople")}
        </p>
      )}
      {person && (
        <>
          <div data-ui="form-select-label" className="grid gap-2 text-secondary text-text-2">
            <label htmlFor={id}>{t("settings.people")}</label>
            <select
              id={id}
              className="w-full rounded-control border border-line bg-surface-2 px-3 py-2 text-body text-text"
              value={person.id}
              onChange={(event) => setSelected(event.target.value)}
            >
              {people.data?.map((entry) => (
                <option key={entry.id} value={entry.id}>
                  {entry.name}
                </option>
              ))}
            </select>
          </div>
          {person.role === "viewer" && (
            <p data-ui="fixed-label" className="text-secondary text-text-2">
              {t("assistant.viewerHint")}
            </p>
          )}
          <AssistantChatPanel key={person.id} person={person} />
        </>
      )}
    </section>
  );
}
