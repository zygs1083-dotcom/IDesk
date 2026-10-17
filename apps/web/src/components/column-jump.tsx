import { useLang } from "../i18n/lang.tsx";

export function ColumnJump({ options }: { options: { id: string; label: string }[] }) {
  const { t } = useLang();
  return (
    <select
      aria-label={t("desk.jumpColumn")}
      className="w-full shrink-0 rounded-control border border-line bg-surface px-3 py-2 text-secondary sidebar:hidden"
      onChange={(event) =>
        document
          .getElementById(event.target.value)
          ?.scrollIntoView({ block: "nearest", inline: "start" })
      }
    >
      {options.map(({ id, label }) => (
        <option key={id} value={id}>
          {label}
        </option>
      ))}
    </select>
  );
}
