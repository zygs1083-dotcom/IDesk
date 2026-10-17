import { type Config, githubFetch, type Run } from "./api.ts";

// GitHub caps searches using `created` at 1000 results. Split in whole seconds,
// the API's timestamp precision; a saturated single second cannot be subdivided.
export async function listWindow(
  config: Config,
  from: number,
  to: number,
  pageSize: number,
): Promise<Run[]> {
  const query = new URLSearchParams({
    per_page: String(pageSize),
    created: `${new Date(from * 1000).toISOString()}..${new Date(to * 1000).toISOString()}`,
  });
  const runs: Run[] = [];
  for (let pageNo = 1; ; pageNo++) {
    if (pageNo > 1) query.set("page", String(pageNo));
    const response = await githubFetch(config, `/actions/runs?${query}`);
    const page = (await response.json()) as { workflow_runs: Run[]; total_count?: number };
    runs.push(...page.workflow_runs);
    const hasNext = response.headers.get("link")?.includes('rel="next"') === true;
    if (
      (page.total_count ?? 0) > 1000 ||
      (runs.length >= 1000 && (page.total_count === undefined || hasNext))
    ) {
      if (from === to)
        throw new Error("GitHub single-second window exceeds the 1000-result API limit");
      const middle = Math.floor((from + to) / 2);
      const left = await listWindow(config, from, middle, pageSize);
      const right = await listWindow(config, middle + 1, to, pageSize);
      return [...new Map([...left, ...right].map((run) => [run.id, run])).values()];
    }
    if (!hasNext) {
      const unique = [...new Map(runs.map((run) => [run.id, run])).values()];
      if (page.total_count !== undefined && unique.length >= page.total_count) return unique;
      if (page.workflow_runs.length < pageSize) {
        if (page.total_count !== undefined)
          throw new Error(
            "GitHub run listing ended before total_count unique results were collected",
          );
        return unique;
      }
    }
  }
}
