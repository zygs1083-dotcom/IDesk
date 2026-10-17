import type { relayMessageSchema } from "@idesk/shared/relay-schemas";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import type { z } from "zod";
import { useLang } from "../../i18n/lang.tsx";
import { request } from "../../lib/api.ts";
import { useTasks } from "../../lib/use-tasks.ts";
import { TaskDrawer } from "../desk/task-drawer.tsx";
import { RelayMessage } from "./relay-message.tsx";
import { relayThread } from "./thread.ts";

type Message = z.infer<typeof relayMessageSchema>;

export function RelayDetail({
  selected,
  onReply,
}: {
  selected: Message;
  onReply: (message: Message) => void;
}) {
  const { t } = useLang();
  const [taskId, setTaskId] = useState<string | null>(null);
  const { tasks } = useTasks();
  const titles = new Map(tasks.map((task) => [task.id, task.title]));
  const {
    data: messages = [],
    error,
    isPending,
  } = useQuery({
    queryKey: ["relay", "thread", selected.id],
    queryFn: () => request<Message[]>(`/relay/${encodeURIComponent(selected.id)}/thread`),
  });
  if (error)
    return (
      <p role="alert" className="p-6 text-status-failed">
        {error.message}
      </p>
    );
  if (isPending) return <p className="p-6 text-secondary text-text-2">{t("common.loading")}</p>;
  const thread = relayThread(messages, selected.id);
  if (!thread) return null;
  const depths = new Map(thread.descendants.map(({ message, depth }) => [message.id, depth]));
  const entries = [
    { message: thread.root, depth: 0 },
    ...messages
      .filter((message) => message.id !== thread.root.id)
      .map((message) => ({ message, depth: depths.get(message.id) ?? 0 })),
  ];
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
          for (let level = 0; level < Math.min(depth, 6); level++)
            content = <div className="ml-4 border-l border-line pl-4">{content}</div>;
          return <div key={message.id}>{content}</div>;
        })}
      </div>
      {taskId && <TaskDrawer taskId={taskId} onClose={() => setTaskId(null)} />}
    </>
  );
}
