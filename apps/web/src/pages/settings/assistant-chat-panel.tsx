import type { AssistantReply } from "@idesk/shared/assistant-schemas";
import type { Person } from "@idesk/shared/people-schemas";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { Button } from "../../components/button.tsx";
import { Field } from "../../components/field.tsx";
import { useLang } from "../../i18n/lang.tsx";
import { request } from "../../lib/api.ts";

export function AssistantChatPanel({ person }: { person: Person }) {
  const { t } = useLang();
  const client = useQueryClient();
  const [text, setText] = useState("");
  const [messages, setMessages] = useState<
    { id: number; role: "user" | "assistant"; reply: AssistantReply }[]
  >([]);
  const nextId = useRef(0);
  const log = useRef<HTMLDivElement>(null);
  const send = useMutation({
    mutationFn: (message: { text: string; label: string }) =>
      request<AssistantReply>("/assistant/chat", {
        method: "POST",
        body: JSON.stringify({ personId: person.id, text: message.text }),
      }),
    onMutate: (message) => {
      const id = nextId.current++;
      setMessages((rows) =>
        rows.concat({ id, role: "user", reply: { text: message.label } }).slice(-20),
      );
      setText("");
    },
    onSuccess: (reply) => {
      const id = nextId.current++;
      setMessages((rows) => rows.concat({ id, role: "assistant", reply }).slice(-20));
      void client.invalidateQueries({ queryKey: ["tasks"] });
      void client.invalidateQueries({ queryKey: ["events"] });
    },
  });
  useEffect(() => {
    if (messages.length && log.current) log.current.scrollTop = log.current.scrollHeight;
  }, [messages]);
  return (
    <div className="min-w-0 space-y-3">
      <div
        ref={log}
        role="log"
        aria-label={t("assistant.conversation")}
        aria-live="polite"
        className="h-60 space-y-3 overflow-y-auto rounded-control border border-line bg-surface-2 p-3"
      >
        {messages.length === 0 && (
          <p data-ui="fixed-label" className="text-secondary text-text-2">
            {t("assistant.chatEmpty")}
          </p>
        )}
        {messages.map((message, index) => (
          <div
            key={message.id}
            className={
              message.role === "user"
                ? "ml-6 rounded-control border border-line bg-surface p-3"
                : "mr-6 space-y-2"
            }
          >
            <p className="whitespace-pre-wrap break-words text-body [overflow-wrap:anywhere]">
              {message.reply.text}
            </p>
            {index === messages.length - 1 && message.reply.options && (
              <div className="flex flex-wrap gap-2">
                {message.reply.options.map((option) => (
                  <Button
                    key={option.id}
                    disabled={send.isPending}
                    onClick={() => send.mutate({ text: option.id, label: option.label })}
                  >
                    {option.label}
                  </Button>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
      <form
        className="flex min-w-0 items-end gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          if (text.trim() && !send.isPending)
            send.mutate({ text: text.trim(), label: text.trim() });
        }}
      >
        <div className="min-w-0 flex-1">
          <Field
            label={t("assistant.message")}
            value={text}
            onChange={(event) => setText(event.target.value)}
          />
        </div>
        <Button type="submit" variant="primary" disabled={!text.trim() || send.isPending}>
          {t(send.isPending ? "assistant.sending" : "assistant.send")}
        </Button>
      </form>
      {send.error && (
        <p role="alert" className="text-secondary text-status-failed">
          {send.error.message}
        </p>
      )}
    </div>
  );
}
