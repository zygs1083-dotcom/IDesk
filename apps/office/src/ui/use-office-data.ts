import type { publicAgentSchema } from "@idesk/shared/agent-schemas";
import type { taskSchema } from "@idesk/shared/task-schemas";
import { useEffect, useState } from "react";
import type { z } from "zod";
import { request } from "../lib/api.ts";
import { onRealtimeEvent } from "../lib/realtime.ts";

export type Agent = z.infer<typeof publicAgentSchema>;
export type Task = z.infer<typeof taskSchema>;
const AGENT_REFRESH_MS = 30_000;

export function useOfficeData() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [error, setError] = useState("");
  useEffect(() => {
    let disposed = false;
    const refreshAgents = () => {
      void request<Agent[]>("/agents")
        .then((data) => {
          if (!disposed) setAgents(data);
        })
        .catch((reason: Error) => {
          if (!disposed) setError(reason.message);
        });
    };
    const refreshTasks = () => {
      void request<Task[]>("/tasks")
        .then((data) => {
          if (!disposed) setTasks(data);
        })
        .catch((reason: Error) => {
          if (!disposed) setError(reason.message);
        });
    };
    refreshAgents();
    refreshTasks();
    const unsubscribe = onRealtimeEvent((event) => {
      if (event.type.startsWith("agent.")) refreshAgents();
      if (event.type.startsWith("task.")) refreshTasks();
    });
    const interval = setInterval(refreshAgents, AGENT_REFRESH_MS);
    return () => {
      disposed = true;
      unsubscribe();
      clearInterval(interval);
    };
  }, []);
  return { agents, tasks, error };
}
