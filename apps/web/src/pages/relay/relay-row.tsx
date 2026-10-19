import { labels } from "@idesk/shared/labels";
import type { relayMessageSchema } from "@idesk/shared/relay-schemas";
import type { z } from "zod";
import { PixelIcon } from "../../components/pixel-icon.tsx";
import { useLang } from "../../i18n/lang.tsx";
import { cn } from "../../lib/cn.ts";
import { relativeTime } from "../../lib/format.ts";
import { useAgents } from "../../lib/use-agents.ts";
import { recipientLabel } from "./labels.ts";

export function RelayRow({
  message,
  selected,
  onSelect,
}: {
  message: z.infer<typeof relayMessageSchema>;
  selected: boolean;
  onSelect: () => void;
}) {
  const { lang } = useLang();
  const { agentName } = useAgents();
  const unread = message.to.kind === "human" && !message.readBy.includes("human");
  return (
    <button
      type="button"
      data-ui="message"
      data-unread={unread ? "true" : undefined}
      aria-pressed={selected}
      onClick={onSelect}
      className={cn(
        "block w-full space-y-2 border-b border-line p-4 text-left transition-colors duration-hover ease-hover hover:bg-surface-2",
        selected && "bg-surface-2",
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <span
          data-ui="relay-kind"
          className="rounded-tag bg-line px-2 py-0.5 text-label text-text-2"
        >
          <PixelIcon name="mail" className="pixel-only" />
          {labels(lang).relayKind[message.kind]}
        </span>
        <time className="text-label tabular-nums text-text-2">
          {relativeTime(new Date(message.createdAt), lang)}
        </time>
      </div>
      <p data-ui="relay-row-title" className={cn("truncate text-body", unread && "font-semibold")}>
        {message.subject}
      </p>
      <p data-ui="relay-row-route" className="truncate text-secondary text-text-2">
        {agentName(message.fromAgentId)} → {recipientLabel(message.to, agentName, lang)}
      </p>
    </button>
  );
}
