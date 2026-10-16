import { useLang } from "../i18n/lang.tsx";
import { cn } from "../lib/cn.ts";
import type { Agent } from "../lib/types.ts";
import { capabilityCountKey, claimableAgents } from "./capability-options.ts";

export function ClaimableHint({
  capabilities,
  agents,
}: {
  capabilities: string[];
  agents: Agent[];
}) {
  const { t } = useLang();
  const { state, total, online } = claimableAgents(capabilities, agents);
  return (
    <p
      aria-live="polite"
      className={cn(
        "text-secondary",
        state === "offline" || state === "none" ? "text-status-paused" : "text-text-2",
      )}
    >
      {t(
        state === "online" || state === "offline"
          ? capabilityCountKey(state, state === "online" ? online : total)
          : `capability.claim.${state}`,
        { total, online },
      )}
    </p>
  );
}
