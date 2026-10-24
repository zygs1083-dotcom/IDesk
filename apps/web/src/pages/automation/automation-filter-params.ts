import type { RunRange } from "./filter-runs.ts";

export function automationFilterParams<T extends { id: string }>(
  params: URLSearchParams,
  connectors: T[],
  status: "pending" | "error" | "success",
) {
  const search = params.get("q") ?? "";
  const range: RunRange = params.get("range") === "all" ? "all" : "today";
  const connector = connectors.find((item) => item.id === params.get("connector")) ?? connectors[0];
  const normalized = new URLSearchParams(params);
  if (search === "") normalized.delete("q");
  if (params.has("range")) normalized.set("range", range);
  if (status === "success" && connector) normalized.set("connector", connector.id);
  return { search, range, connector, normalized };
}
