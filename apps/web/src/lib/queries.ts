import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { api, type Agent, type IDeskEvent, type RelayMessage, type Task, type TaskDetail } from "./api.ts";

export const keys = {
  me: ["me"] as const,
  tasks: ["tasks"] as const,
  task: (id: string) => ["tasks", id] as const,
  agents: ["agents"] as const,
  relay: (box: string) => ["relay", box] as const,
  events: ["events"] as const,
};

export function useMe() {
  return useQuery({ queryKey: keys.me, queryFn: () => api.get<{ kind: "owner" | "agent" | null }>("/auth/me"), staleTime: 60_000 });
}
export function useTasks() {
  return useQuery({ queryKey: keys.tasks, queryFn: async () => (await api.get<{ tasks: Task[] }>("/tasks?limit=500")).tasks });
}
export function useTask(id: string | null) {
  return useQuery({ queryKey: keys.task(id ?? ""), queryFn: () => api.get<TaskDetail>(`/tasks/${id}`), enabled: !!id });
}
export function useAgents() {
  return useQuery({ queryKey: keys.agents, queryFn: async () => (await api.get<{ agents: Agent[] }>("/agents")).agents });
}
export function useRelay(box: string) {
  return useQuery({ queryKey: keys.relay(box), queryFn: () => api.get<{ messages: RelayMessage[]; unread: number }>(`/relay?box=${encodeURIComponent(box)}&limit=200`) });
}
export function useEvents() {
  return useQuery({ queryKey: keys.events, queryFn: async () => (await api.get<{ events: IDeskEvent[] }>("/events?limit=200")).events });
}

export function useInvalidateAll() {
  const qc = useQueryClient();
  return () => {
    void qc.invalidateQueries({ queryKey: keys.tasks });
    void qc.invalidateQueries({ queryKey: keys.agents });
    void qc.invalidateQueries({ queryKey: ["relay"] });
    void qc.invalidateQueries({ queryKey: keys.events });
  };
}

/** Live updates: every server event invalidates the relevant caches. */
export function useLiveEvents(enabled: boolean) {
  const invalidate = useInvalidateAll();
  useEffect(() => {
    if (!enabled) return;
    const es = new EventSource("/api/events/stream", { withCredentials: true });
    let timer: ReturnType<typeof setTimeout> | null = null;
    const schedule = () => {
      if (timer) return;
      timer = setTimeout(() => { timer = null; invalidate(); }, 150);
    };
    es.onmessage = schedule;
    const types = ["task.published","task.claim","task.assign","task.start","task.join","task.pause","task.resume","task.release","task.handoff","task.complete","task.cancel","task.reopen","task.progress","task.updated","task.deleted","task.lease_expired","agent.registered","relay.message"];
    for (const t of types) es.addEventListener(t, schedule);
    return () => { es.close(); if (timer) clearTimeout(timer); };
  }, [enabled]);
}

export function useTaskAction() {
  const invalidate = useInvalidateAll();
  return useMutation({
    mutationFn: ({ id, action, body }: { id: string; action: string; body?: unknown }) => api.post<Task>(`/tasks/${id}/${action}`, body),
    onSuccess: invalidate,
  });
}
