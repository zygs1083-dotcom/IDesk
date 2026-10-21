import type { Person } from "@idesk/shared/people-schemas";
import { queryOptions, useQuery } from "@tanstack/react-query";
import { request } from "./api.ts";

export const peopleQueryOptions = queryOptions({
  queryKey: ["people"],
  queryFn: () => request<Person[]>("/people"),
  refetchInterval: 30_000,
});

export function usePeople() {
  return useQuery(peopleQueryOptions);
}
