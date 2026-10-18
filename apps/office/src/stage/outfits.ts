import type { Agent } from "./textures.ts";

export type OutfitIndex = Partial<Record<Agent["kind"], string[]>>;

export function assignOutfits(agents: Pick<Agent, "id" | "kind">[], index: OutfitIndex) {
  const counts = new Map<Agent["kind"], number>();
  const assigned = new Map<string, string>();
  for (const agent of [...agents].sort((a, b) => a.id.localeCompare(b.id))) {
    const kind = index[agent.kind]?.length ? agent.kind : "custom";
    const outfits = index[kind] ?? [];
    const n = counts.get(agent.kind) ?? 0;
    if (outfits.length) assigned.set(agent.id, `${kind}-${outfits[n % outfits.length]}`);
    counts.set(agent.kind, n + 1);
  }
  return assigned;
}
