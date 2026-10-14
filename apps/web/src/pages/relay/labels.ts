import type { RelayRecipient } from "@idesk/shared/relay";

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
