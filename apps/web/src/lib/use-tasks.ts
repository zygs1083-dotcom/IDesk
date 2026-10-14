import { useQuery } from "@tanstack/react-query";
import { request } from "./api.ts";
import type { Task } from "./types.ts";

export function useTasks() {
  const {
    data: tasks = [],
    error,
    isPending,
  } = useQuery({
    queryKey: ["tasks"],
    queryFn: () => request<Task[]>("/tasks"),
  });
  return { tasks, error, isPending };
}
