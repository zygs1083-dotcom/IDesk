import type { AgentKind, AgentPresence, Artifact, RelayKind, TaskAction, TaskOutcome, TaskStatus } from "@idesk/core";

export class ApiError extends Error {
  constructor(public status: number, message: string, public issues?: unknown) {
    super(message);
  }
}

export interface Agent {
  id: string; name: string; kind: AgentKind; host: string; capabilities: string[];
  presence: AgentPresence; online: boolean; load: number | null; apiKeyPrefix: string;
  webhookUrl: string | null; maxConcurrent: number; disabled: boolean; metadata: Record<string, unknown>;
  lastSeenAt: string | null; createdAt: string;
}
export interface Assignee { agentId: string; name: string; role: "owner" | "member"; joinedAt: string }
export interface Task {
  id: string; title: string; description: string; status: TaskStatus; outcome: TaskOutcome | null; priority: number;
  tags: string[]; requiredCapabilities: string[]; minAgents: number; publisherKind: string; publisherId: string | null;
  publisherName: string | null; payload: unknown; result: unknown; summary: string | null; deadline: string | null;
  leaseTtlSeconds: number; leaseExpiresAt: string | null; parentId: string | null; createdAt: string; updatedAt: string;
  completedAt: string | null; assignees: Assignee[]; availableActions: TaskAction[];
}
export interface IDeskEvent {
  id: number; ts: string; type: string; taskId: string | null; agentId: string | null; actorKind: string; actorId: string | null; payload: Record<string, unknown>;
}
export interface RelayMessage {
  id: string; kind: RelayKind; taskId: string | null; fromKind: "agent" | "human" | "system"; fromAgentId: string | null;
  toAgentId: string | null; toCapability: string | null; subject: string; body: string; artifacts: Artifact[];
  replyTo: string | null; readAt: string | null; createdAt: string; fromName: string | null; toName: string | null; taskTitle: string | null;
}
export type TaskDetail = Task & { events: IDeskEvent[]; relay: RelayMessage[] };

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const res = await fetch(`/api${path}`, {
    method,
    credentials: "include",
    headers: body !== undefined ? { "content-type": "application/json" } : {},
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  const data = text ? JSON.parse(text) : null;
  if (!res.ok) throw new ApiError(res.status, data?.error ?? res.statusText, data?.issues);
  return data as T;
}

export const api = {
  get: <T>(path: string) => request<T>("GET", path),
  post: <T>(path: string, body?: unknown) => request<T>("POST", path, body ?? {}),
  patch: <T>(path: string, body: unknown) => request<T>("PATCH", path, body),
  delete: <T>(path: string) => request<T>("DELETE", path),
};
