import type { Receiver } from "./receiver.js";
import { receiverClient } from "./receiver.js";

type Task = { id: string; status: string; assigneeId: string | null };

export async function receiverHeartbeat(receiver: Receiver): Promise<void> {
  await receiver.request("POST", "/agents/me/heartbeat", {
    client: receiverClient(receiver.config),
  });
}
export async function renewTasks(receiver: Receiver): Promise<void> {
  const tasks = await receiver.request<Task[]>(
    "GET",
    `/tasks?status=in_progress&assignee=${encodeURIComponent(receiver.me.id)}`,
  );
  const ids = new Set(tasks.map((task) => task.id));
  for (const id of Object.keys(receiver.state.inProgressSince))
    if (!ids.has(id)) delete receiver.state.inProgressSince[id];
  for (const task of tasks) {
    const first = receiver.state.inProgressSince[task.id] ?? new Date(receiver.now()).toISOString();
    receiver.state.inProgressSince[task.id] = first;
    if (receiver.now() - Date.parse(first) >= 4 * 60 * 60_000) {
      await receiver.request("POST", `/tasks/${encodeURIComponent(task.id)}/report`, {
        message: "已连续进行 4 小时，暂停等人确认",
      });
      await receiver.request("POST", `/tasks/${encodeURIComponent(task.id)}/actions/pause`, {});
      delete receiver.state.inProgressSince[task.id];
    } else
      await receiver.request("POST", `/tasks/${encodeURIComponent(task.id)}/actions/heartbeat`, {});
  }
  await receiver.save();
}
export async function recoverAssignments(receiver: Receiver): Promise<void> {
  const tasks = await receiver.request<Task[]>(
    "GET",
    `/tasks?status=assigned&assignee=${encodeURIComponent(receiver.me.id)}`,
  );
  for (const task of tasks) {
    if (
      receiver.pendingTasks.has(task.id) ||
      receiver.now() - (receiver.lastWoken.get(task.id) ?? -Infinity) < 600_000
    )
      continue;
    receiver.enqueue(
      `IDesk：任务 ${task.id} 已指派给你（补漏）。按 ${receiver.credentials.url}/agent-guide.md 第 5 节处理。`,
      task.id,
    );
  }
}
export async function recoverUnread(receiver: Receiver): Promise<void> {
  const summary = await receiver.request<{ unread: number }>("GET", "/relay/summary");
  if (summary.unread > 0)
    receiver.enqueue(
      `IDesk：你有 ${summary.unread} 条未读传递区消息。按 ${receiver.credentials.url}/agent-guide.md 第 6 节处理。`,
    );
}
