export function parseEnabledFilter(params: URLSearchParams) {
  const value = params.get("enabled");
  return value === "true" || value === "false" ? value : "";
}
