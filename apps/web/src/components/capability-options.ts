import { presetCapabilities } from "@idesk/shared/capabilities";
import type { Lang } from "@idesk/shared/labels";
import type { Agent } from "../lib/types.ts";

type CapabilityAgent = Pick<Agent, "capabilities" | "status">;

export function capabilityOptions(agents: CapabilityAgent[], lang: Lang) {
  const labels = new Map(presetCapabilities.map(({ value, label }) => [value, label[lang]]));
  const values = new Set([...labels.keys(), ...agents.flatMap((agent) => agent.capabilities)]);
  return [...values].map((value) => {
    const matching = agents.filter((agent) => agent.capabilities.includes(value));
    return {
      value,
      label: labels.get(value) ?? value,
      total: matching.length,
      online: matching.filter((agent) => agent.status === "online").length,
    };
  });
}

export function missingCapabilities(required: string[], available: string[]) {
  return required.filter((value) => !available.includes(value));
}

export function claimableAgents(required: string[], agents: CapabilityAgent[]) {
  const matching = agents.filter(
    (agent) => missingCapabilities(required, agent.capabilities).length === 0,
  );
  const online = matching.filter((agent) => agent.status === "online").length;
  return {
    state:
      required.length === 0
        ? "any"
        : online > 0
          ? "online"
          : matching.length > 0
            ? "offline"
            : "none",
    total: matching.length,
    online,
  } as const;
}

export function capabilityName(value: string, lang: Lang) {
  const preset = presetCapabilities.find((entry) => entry.value === value);
  return { label: preset ? preset.label[lang] : value, detail: preset ? value : null };
}

export function visibleCapabilities(
  options: ReturnType<typeof capabilityOptions>,
  selected: string[],
  input: string,
) {
  const query = input.trim().toLowerCase();
  return options.filter(
    (option) =>
      !selected.includes(option.value) &&
      `${option.label} ${option.value}`.toLowerCase().includes(query),
  );
}

export function availablePresets(selected: string[]) {
  return presetCapabilities.filter((preset) => !selected.includes(preset.value));
}

export function addCapability(selected: string[], value: string, mode: "multi" | "single") {
  return mode === "single" ? [value] : [...new Set([...selected, value])];
}

export function capabilityCountKey(kind: "recipients" | "online" | "offline", count: number) {
  const keys = {
    recipients: "capability.recipients",
    online: "capability.claim.online",
    offline: "capability.claim.offline",
  } as const;
  return count === 1 ? (`${keys[kind]}.one` as const) : keys[kind];
}
