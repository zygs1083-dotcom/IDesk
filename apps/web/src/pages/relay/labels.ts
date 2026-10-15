import type { Lang } from "@idesk/shared/labels";
import type { RelayRecipient } from "@idesk/shared/relay";
import { translator } from "../../i18n/translate.ts";

export function recipientLabel(
  to: RelayRecipient,
  agentName: (id: string | null) => string,
  lang: Lang,
): string {
  const t = translator(lang);
  switch (to.kind) {
    case "agent":
      return agentName(to.id);
    case "capability":
      return t("relay.capability", { p1: to.value });
    case "broadcast":
      return t("relay.everyone");
  }
}
