import type { Person } from "@idesk/shared/people-schemas";
import { Menu } from "../../components/menu.tsx";
import { useLang } from "../../i18n/lang.tsx";

export function PersonRow({
  person,
  admin,
  busy,
  onEdit,
  onBind,
  onUnbind,
  onDelete,
}: {
  person: Person;
  admin: boolean;
  busy: boolean;
  onEdit: (field: "name" | "role") => void;
  onBind: () => void;
  onUnbind: (id: string) => void;
  onDelete: () => void;
}) {
  const { t } = useLang();
  return (
    <tr data-ui="person-row" className="border-t border-line">
      <td className="max-w-80 truncate px-4 py-2 text-body" title={person.name}>
        {person.name}
      </td>
      <td data-ui="fixed-label" className="whitespace-nowrap px-4 py-2 text-secondary text-text-2">
        {t(person.role === "member" ? "people.member" : "people.viewer")}
      </td>
      <td className="px-4 py-2">
        <div className="flex items-center gap-2">
          {person.bindings.map((binding) => (
            <span
              data-ui="fixed-label"
              key={binding.id}
              title={binding.displayName}
              className="whitespace-nowrap rounded-control border border-line px-2 py-0.5 text-label text-text-2"
            >
              {t(`channel.${binding.channel}`)}
            </span>
          ))}
          {!person.bindings.length && <span className="text-secondary text-text-3">—</span>}
        </div>
      </td>
      {admin && (
        <td className="w-12 px-2 py-1">
          <Menu
            label={t("people.actions", { name: person.name })}
            disabled={busy}
            items={[
              { label: t("people.rename"), onSelect: () => onEdit("name") },
              { label: t("people.changeRole"), onSelect: () => onEdit("role") },
              { label: t("people.bindCode"), onSelect: onBind },
              ...person.bindings.map((binding) => ({
                label: t("people.unbind", { channel: t(`channel.${binding.channel}`) }),
                onSelect: () => onUnbind(binding.id),
              })),
              { label: t("common.delete"), danger: true, onSelect: onDelete },
            ]}
          />
        </td>
      )}
    </tr>
  );
}
