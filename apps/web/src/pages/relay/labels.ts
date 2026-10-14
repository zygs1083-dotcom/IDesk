import type { RelayKind, RelayRecipient } from "@idesk/shared/relay";

export const RELAY_KIND_LABEL: Record<RelayKind, string> = {
  note: "说明",
  deliverable: "成果",
  request: "请求",
  reply: "回复",
};

export function recipientLabel(
  to: RelayRecipient,
  agentName: (id: string | null) => string,
): string {
  switch (to.kind) {
    case "agent":
      return agentName(to.id);
    case "capability":
      return `能力：${to.value}`;
    case "broadcast":
      return "全体";
  }
}
