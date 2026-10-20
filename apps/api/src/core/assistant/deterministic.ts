import type { AssistantReply } from "@idesk/shared/assistant-schemas";
import { TransitionError } from "@idesk/shared/task-machine";
import { TASK_PRIORITIES } from "@idesk/shared/task-status";
import { db } from "../../db/client.ts";
import { taskOrigins } from "../../db/schema.ts";
import { listAgents } from "../agents/agents.ts";
import { getPerson } from "../people/people.ts";
import { publishTask } from "../tasks/publish.ts";
import { getTask } from "../tasks/store.ts";
import { actOnTask } from "../tasks/transition.ts";
import { confirmation } from "./confirmation.ts";
import { taskLink } from "./queries.ts";
import type { Session } from "./sessions.ts";

export function deterministic(
  session: Session,
  text: string,
  action?: string,
): AssistantReply | undefined {
  const command = action
    ? ({ publish: "发布", confirm: "确认", cancel: "取消" }[action] ?? action)
    : text.trim();
  if (command === "重来") {
    session.history = [];
    session.draft = null;
    return { text: "已清空会话，请重新开始。" };
  }
  const draft = session.draft;
  if (!draft) return action ? { text: "该选项已失效，请重新开始。" } : undefined;
  const person = getPerson(session.personId);
  if (person?.role !== "member") {
    session.draft = null;
    return { text: "没有发布或取消任务的权限。" };
  }
  if (["取消", "算了"].includes(command)) {
    session.draft = null;
    return { text: "已丢弃草稿。" };
  }
  if (draft.kind === "task") {
    const number = ["1", "2", "3", "4"].indexOf(command);
    const label = ["低", "普通", "高", "紧急"].indexOf(command);
    const priority = TASK_PRIORITIES[number < 0 ? label : number];
    if (priority) {
      draft.task.priority = priority;
      return confirmation(draft);
    }
    if (["发布", "确认"].includes(command)) {
      const { dispatch, dueAt, ...input } = draft.task;
      if (
        dispatch?.type === "assign" &&
        !listAgents().some((agent) => agent.id === dispatch.agentId)
      )
        return { text: "未发布：指定的智能体已删除，请修改草稿。" };
      const task = publishTask(
        { ...input, ...(dueAt ? { dueAt: new Date(dueAt) } : {}) },
        { kind: "person", id: person.id },
        dispatch,
        { personId: person.id, via: session.channel },
      );
      if (task instanceof TransitionError) return { text: `未发布：${task.message}` };
      if (session.channel !== "web")
        db.insert(taskOrigins)
          .values({
            taskId: task.id,
            channel: session.channel,
            chatId: session.chatId,
            personId: person.id,
          })
          .run();
      session.draft = null;
      return { text: `已发布：${task.title} ${taskLink(task.id)}` };
    }
  } else if (command === "确认") {
    const task = getTask(draft.taskId);
    if (!task || task.publisherId !== person.id) {
      session.draft = null;
      return { text: "只能取消自己发布的任务。" };
    }
    const result = actOnTask(task.id, { type: "cancel" }, { kind: "person", id: person.id });
    session.draft = null;
    return {
      text:
        result instanceof TransitionError || !result
          ? "当前任务不能取消。"
          : `已取消：${task.title}`,
    };
  }
  return action ? confirmation(draft) : undefined;
}
