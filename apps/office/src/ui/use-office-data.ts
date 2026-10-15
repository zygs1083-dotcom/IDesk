import type { publicAgentSchema } from "@idesk/shared/agent-schemas";
import type { taskSchema } from "@idesk/shared/task-schemas";
import { useEffect, useState } from "react";
import type { z } from "zod";
import { request } from "../lib/api.ts";
import { onRealtimeEvent } from "../lib/realtime.ts";

export type Agent = z.infer<typeof publicAgentSchema>;
export type Task = z.infer<typeof taskSchema>;
const AGENT_REFRESH_MS = 30_000;

export function useOfficeData(live: boolean) {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [error, setError] = useState("");
  useEffect(() => {
    const refreshAgents = () => {
      void request<Agent[]>("/agents")
        .then((data) => {
          setAgents(data);
        })
        .catch((reason: Error) => {
          setError(reason.message);
        });
    };
    const refreshTasks = () => {
      void request<Task[]>("/tasks")
        .then((data) => {
          setTasks(data);
        })
        .catch((reason: Error) => {
          setError(reason.message);
        });
    };
    refreshAgents();
    refreshTasks();
    if (!live) return;
    const unsubscribe = onRealtimeEvent((event) => {
      if (event.type.startsWith("agent.")) refreshAgents();
      if (event.type.startsWith("task.")) refreshTasks();
    });
    const interval = setInterval(refreshAgents, AGENT_REFRESH_MS);
    return () => {
      unsubscribe();
      clearInterval(interval);
    };
  }, [live]);
  return { agents, tasks, error };
}
