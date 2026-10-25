import { Search } from "lucide-react";
import { Field } from "../../components/field.tsx";
import { PixelIcon } from "../../components/pixel-icon.tsx";
import { Segmented } from "../../components/segmented.tsx";
import { useLang } from "../../i18n/lang.tsx";
import { RelayFilters } from "./relay-filters.tsx";

export function RelayToolbar({
  box,
  unread,
  onBox,
  q,
  onSearch,
  status,
  onStatus,
  recipient,
  onRecipient,
  kind,
  onKind,
  task,
  onTask,
}: {
  box: string;
  unread: number | undefined;
  onBox: (value: string) => void;
  q: string;
  onSearch: (value: string) => void;
  status: string;
  onStatus: (value: string) => void;
  recipient: string;
  onRecipient: (value: string) => void;
  kind: string;
  onKind: (value: string) => void;
  task: string;
  onTask: (value: string) => void;
}) {
  const { t } = useLang();
  return (
    <div data-ui="relay-toolbar" className="contents">
      <div data-ui="relay-box-control">
        <Segmented
          label={t("nav.relay")}
          value={box}
          onChange={onBox}
          options={[
            { value: "inbox", label: `${t("relay.inbox")}${unread ? ` · ${unread}` : ""}` },
            { value: "sent", label: t("relay.sent") },
            { value: "all", label: t("relay.all") },
          ]}
        />
      </div>
      <div data-ui="relay-search">
        <PixelIcon
          name="search"
          fallback={<Search size={16} strokeWidth={1.5} />}
          className="pixel-only relay-search-icon"
        />
        <Field
          label={t("relay.search")}
          placeholder={t("relay.search")}
          className="placeholder:text-transparent"
          value={q}
          onChange={(event) => onSearch(event.target.value)}
        />
      </div>
      <Segmented
        label={t("relay.requestStatus")}
        value={status}
        onChange={onStatus}
        options={[
          { value: "all", label: t("common.all") },
          { value: "pending", label: t("relay.pending") },
          { value: "answered", label: t("relay.answered") },
        ]}
      />
      <RelayFilters
        recipient={recipient}
        onRecipient={onRecipient}
        kind={kind}
        onKind={onKind}
        task={task}
        onTask={onTask}
      />
    </div>
  );
}
