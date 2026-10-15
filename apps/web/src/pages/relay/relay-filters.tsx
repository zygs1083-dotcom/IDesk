import { labels } from "@idesk/shared/labels";
import { RELAY_KINDS } from "@idesk/shared/relay";
import { Segmented } from "../../components/segmented.tsx";
import { useLang } from "../../i18n/lang.tsx";

export function RelayFilters({
  recipient,
  onRecipient,
  kind,
  onKind,
  task,
  onTask,
}: {
  recipient: string;
  onRecipient: (value: string) => void;
  kind: string;
  onKind: (value: string) => void;
  task: string;
  onTask: (value: string) => void;
}) {
  const { lang, t } = useLang();
  return (
    <div className="flex flex-wrap items-center gap-4 whitespace-nowrap">
      <Segmented
        label={t("relay.recipient")}
        value={recipient}
        onChange={onRecipient}
        options={[
          { value: "all", label: t("relay.all") },
          { value: "agent", label: t("relay.specific") },
          { value: "capability", label: t("relay.capabilities") },
          { value: "broadcast", label: t("relay.everyone") },
        ]}
      />
      <Segmented
        label={t("relay.kind")}
        value={kind}
        onChange={onKind}
        options={[
          { value: "all", label: t("relay.allKinds") },
          ...RELAY_KINDS.map((value) => ({ value, label: labels(lang).relayKind[value] })),
        ]}
      />
      <Segmented
        label={t("relay.relatedTask")}
        value={task}
        onChange={onTask}
        options={[
          { value: "all", label: t("relay.allTasks") },
          { value: "with", label: t("relay.withTask") },
          { value: "without", label: t("relay.withoutTask") },
        ]}
      />
    </div>
  );
}
