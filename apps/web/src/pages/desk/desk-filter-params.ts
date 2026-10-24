import type { HealthFilter } from "./board-health-state.ts";

export function deskFilterParams(params: URLSearchParams, preferredGroup: string | null) {
  const rawGroup = params.get("group");
  const group: "flat" | "host" =
    (rawGroup === null ? preferredGroup : rawGroup) === "host" ? "host" : "flat";
  const rawHealth = params.get("health");
  const healthFilter: HealthFilter | null =
    rawHealth === "in_progress" ||
    rawHealth === "silent" ||
    rawHealth === "blocked" ||
    rawHealth === "waiting"
      ? rawHealth
      : null;
  const search = params.get("q") ?? "";
  const normalized = new URLSearchParams(params);
  normalized.set("group", group);
  if (search === "") normalized.delete("q");
  if (healthFilter === null) normalized.delete("health");
  return { search, group, healthFilter, normalized };
}
