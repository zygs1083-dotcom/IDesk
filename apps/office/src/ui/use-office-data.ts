import type { publicAgentSchema } from "@idesk/shared/agent-schemas";
import type { Person } from "@idesk/shared/people-schemas";
import type { taskSchema } from "@idesk/shared/task-schemas";
import { useEffect, useState } from "react";
import type { z } from "zod";
import { useLang } from "../i18n/lang.tsx";
import { request } from "../lib/api.ts";
import { onRealtimeEvent } from "../lib/realtime.ts";

export type Agent = z.infer<typeof publicAgentSchema>;
export type Task = z.infer<typeof taskSchema>;
const AGENT_REFRESH_MS = 30_000;

export function useOfficeData(live: boolean) {
  const { t } = useLang();
  const [agents, setAgents] = useState<Agent[]>([]);
  const [people, setPeople] = useState<Person[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [error, setError] = useState("");
  const [admin, setAdmin] = useState(false);
  useEffect(() => {
    void request<{ role: "admin" | "viewer" }>("/auth/me")
      .then(({ role }) => setAdmin(role === "admin"))
      .catch((reason: Error) => setError(reason.message));
  }, []);
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
    const refreshPeople = () => {
      void request<Person[]>("/people")
        .then(setPeople)
        .catch((reason: Error) => setError(reason.message));
    };
    refreshAgents();
    refreshTasks();
    refreshPeople();
    if (!live) return;
    const unsubscribe = onRealtimeEvent((event) => {
      if (event.type.startsWith("agent.")) refreshAgents();
      if (event.type.startsWith("task.")) refreshTasks();
      if (event.type.startsWith("person.")) refreshPeople();
    });
    const interval = setInterval(() => {
      refreshAgents();
      refreshPeople();
    }, AGENT_REFRESH_MS);
    return () => {
      unsubscribe();
      clearInterval(interval);
    };
  }, [live]);
  function agentName(id: string | null) {
    if (id === null || id === "human") return t("common.human");
    if (id.startsWith("p_"))
      return people.find((person) => person.id === id)?.name ?? t("people.deleted");
    return agents.find((agent) => agent.id === id)?.name ?? t("common.deletedAgent");
  }
  return { agents, tasks, admin, error, agentName };
}
