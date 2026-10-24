import { useQueries, useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { request } from "../../lib/api.ts";
import type { Task, TaskEvent } from "../../lib/types.ts";
import { boardHealth, type HealthQueryStatus, type PendingRequest } from "./board-health-state.ts";

export function useBoardHealth(scope: Task[], tasks: Task[]) {
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(timer);
  }, []);
  const running = scope.filter((task) => task.status === "in_progress");
  const queries = useQueries({
    queries: running.map((task) => ({
      queryKey: ["task", task.id, "events"],
      queryFn: () => request<TaskEvent[]>(`/tasks/${task.id}/events`),
    })),
  });
  const relay = useQuery({
    queryKey: ["relay", "board-health"],
    queryFn: () =>
      request<PendingRequest[]>("/relay?box=all&kind=request&requestStatus=pending&hasTask=true"),
  });
  const events = new Map<string, TaskEvent[]>();
  running.forEach((task, index) => {
    const data = queries[index]?.data;
    if (data) events.set(task.id, data);
  });
  const eventError = queries.find((query) => query.error)?.error;
  const status: HealthQueryStatus = {
    silent: eventError ? "error" : queries.some((query) => query.isPending) ? "pending" : "success",
    waiting: relay.status,
  };
  return {
    health: boardHealth(scope, tasks, events, relay.data ?? [], now),
    status,
    error: eventError ?? relay.error,
  };
}
