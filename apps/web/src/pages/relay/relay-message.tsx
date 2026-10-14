import type { relayMessageSchema } from "@idesk/shared/relay-schemas";
import ReactMarkdown from "react-markdown";
import type { z } from "zod";
import { Button } from "../../components/button.tsx";
import { relativeTime } from "../../lib/format.ts";
import { useAgents } from "../../lib/use-agents.ts";
import { RELAY_KIND_LABEL, recipientLabel } from "./labels.ts";

type Message = z.infer<typeof relayMessageSchema>;

export function RelayMessage({
  message,
  taskTitle,
  onTask,
  onReply,
}: {
  message: Message;
  taskTitle: string | undefined;
  onTask: (id: string) => void;
  onReply: (message: Message) => void;
}) {
  const { agentName } = useAgents();
  const taskId = message.taskId;
  return (
    <article className="space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 space-y-2">
          <p className="text-label text-text-2">
            {RELAY_KIND_LABEL[message.kind]} · {relativeTime(new Date(message.createdAt))}
          </p>
          <h2 className="break-words text-section">{message.subject}</h2>
          <p className="break-words text-secondary text-text-2">
            {agentName(message.fromAgentId)} → {recipientLabel(message.to, agentName)}
          </p>
        </div>
        {message.fromAgentId !== "human" && (
          <Button className="shrink-0" onClick={() => onReply(message)}>
            回复
          </Button>
        )}
      </div>
      {taskId && (
        <div className="flex items-center gap-2 text-secondary">
          <span className="shrink-0 text-text-2">关联任务</span>
          <Button
            className="min-w-0 justify-start border-0 p-0 text-secondary text-accent"
            onClick={() => onTask(taskId)}
          >
            <span className="truncate">{taskTitle ?? taskId.slice(0, 8)}</span>
          </Button>
        </div>
      )}
      <div className="space-y-3 break-words text-body [&_a]:text-accent [&_a]:underline [&_blockquote]:border-l [&_blockquote]:border-line-strong [&_blockquote]:pl-3 [&_blockquote]:text-text-2 [&_code]:rounded-tag [&_code]:bg-surface-2 [&_code]:px-1 [&_h1]:text-section [&_h2]:text-section [&_h3]:text-section [&_li]:ml-4 [&_ol]:list-decimal [&_p]:my-3 [&_pre]:overflow-auto [&_pre]:rounded-control [&_pre]:bg-surface-2 [&_pre]:p-3 [&_ul]:list-disc">
        <ReactMarkdown>{message.body}</ReactMarkdown>
      </div>
      <p className="text-label text-text-2">
        {message.readBy.length > 0
          ? `已读：${message.readBy.map(agentName).join(" · ")}`
          : "尚未读"}
      </p>
    </article>
  );
}
