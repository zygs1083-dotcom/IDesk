import { useEffect, useId, useState } from "react";
import { useLang } from "../../i18n/lang.tsx";
import { usePeople } from "../../lib/use-people.ts";

export function usePublisher() {
  const { data: people, isSuccess } = usePeople();
  const [selected, setSelected] = useState(() => localStorage.getItem("publish.person") ?? "human");
  const members = people?.filter((person) => person.role === "member") ?? [];
  const publisherId = members.some((person) => person.id === selected) ? selected : "human";
  useEffect(() => {
    if (isSuccess && selected !== publisherId) {
      setSelected(publisherId);
      localStorage.setItem("publish.person", publisherId);
    }
  }, [isSuccess, selected, publisherId]);
  function select(id: string) {
    setSelected(id);
    localStorage.setItem("publish.person", id);
  }
  return { people: people ?? [], members, publisherId, select };
}

export function PublisherSelect({ publisher }: { publisher: ReturnType<typeof usePublisher> }) {
  const { t } = useLang();
  const id = useId();
  if (!publisher.people.length) return null;
  return (
    <div data-ui="form-select-label" className="grid gap-2 text-secondary text-text-2">
      <label htmlFor={id}>{t("desk.publisher")}</label>
      <select
        id={id}
        className="min-w-0 rounded-control border border-line bg-surface-2 px-3 py-2 text-body text-text"
        value={publisher.publisherId}
        onChange={(event) => publisher.select(event.target.value)}
      >
        <option value="human">{t("common.human")}</option>
        {publisher.members.map((person) => (
          <option key={person.id} value={person.id}>
            {person.name}
          </option>
        ))}
      </select>
    </div>
  );
}
