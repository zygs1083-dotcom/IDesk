import type { relayMessageSchema } from "@idesk/shared/relay-schemas";
import { useState } from "react";
import type { z } from "zod";
import { useTasks } from "../../lib/use-tasks.ts";
import { TaskDrawer } from "../desk/task-drawer.tsx";
import { RelayMessage } from "./relay-message.tsx";
import { relayThread } from "./thread.ts";

type Message = z.infer<typeof relayMessageSchema>;

export function RelayDetail({
  messages,
  selected,
  onReply,
}: {
  messages: Message[];
  selected: Message;
  onReply: (message: Message) => void;
}) {
  const [taskId, setTaskId] = useState<string | null>(null);
  const { tasks } = useTasks();
  const titles = new Map(tasks.map((task) => [task.id, task.title]));
  const thread = relayThread(messages, selected.id);
  if (!thread) return null;
  const entries = [{ message: thread.root, depth: 0 }, ...thread.descendants];
  return (
    <>
      <div className="space-y-6 p-6">
        {entries.map(({ message, depth }) => {
          let content = (
            <RelayMessage
              message={message}
              taskTitle={message.taskId ? titles.get(message.taskId) : undefined}
              onTask={setTaskId}
              onReply={onReply}
            />
          );
          for (let level = 0; level < depth; level++)
            content = <div className="ml-4 border-l border-line pl-4">{content}</div>;
          return <div key={message.id}>{content}</div>;
        })}
      </div>
      {taskId && <TaskDrawer taskId={taskId} onClose={() => setTaskId(null)} />}
    </>
  );
}
