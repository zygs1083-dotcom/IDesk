import { readFile } from "node:fs/promises";
import { labels } from "@idesk/shared/labels";
import type { relayMessageSchema } from "@idesk/shared/relay-schemas";

import type { Command } from "commander";
import { api } from "../client.js";
import { formatAgentName, formatTime } from "../labels.js";
import { output } from "../output.js";

type Message = typeof relayMessageSchema._output;

export function relayCommands(program: Command): void {
  const relay = program.command("relay");
  relay
    .command("send")
    .option("--to <agent>")
    .option("--cap <capability>")
    .option("--all")
    .requiredOption("--subject <subject>")
    .option("--body-file <path>")
    .option("--task <id>")
    .option("--kind <kind>", "消息种类")
    .option("--reply-to <id>")
    .action(
      async (options: {
        to?: string;
        cap?: string;
        all?: boolean;
        subject: string;
        bodyFile?: string;
        task?: string;
        kind?: string;
        replyTo?: string;
      }) => {
        if (
          Number(options.to !== undefined) +
            Number(options.cap !== undefined) +
            Number(options.all === true) !==
          1
        ) {
          throw new Error("--to、--cap、--all 只能选一个");
        }
        const to =
          options.to !== undefined
            ? { kind: "agent", id: options.to }
            : options.cap !== undefined
              ? { kind: "capability", value: options.cap }
              : { kind: "broadcast" };
        const message = await api<Message>("POST", "/relay", {
          to,
          kind: options.kind ?? (options.replyTo ? "reply" : "note"),
          replyTo: options.replyTo,
          subject: options.subject,
          body:
            options.bodyFile === undefined ? undefined : await readFile(options.bodyFile, "utf8"),
          taskId: options.task,
        });
        output(program.opts().json, message, `已发送 ${message.id}`);
      },
    );

  relay
    .command("inbox")
    .option("--all")
    .action(async (options: { all?: boolean }) => {
      const me = await api<{ id: string }>("GET", "/agents/me");
      const inbox = await api<Message[]>("GET", "/relay?box=inbox");
      const messages = options.all
        ? inbox
        : inbox.filter((message) => !message.readBy.includes(me.id));
      if (program.opts().json) {
        output(true, messages, "");
        return;
      }
      const agents = await api<{ id: string; name: string; host: string }[]>("GET", "/agents");
      output(false, messages, [
        ["id", "种类", "发送者", "标题", "时间"],
        ...messages.map((message) => [
          message.id,
          labels("zh").relayKind[message.kind],
          formatAgentName(message.fromAgentId, agents),
          message.subject,
          formatTime(message.createdAt),
        ]),
      ]);
    });
  relay
    .command("read <id>")
    .option("--peek")
    .action(async (id: string, options: { peek?: boolean }) => {
      const path = `/relay/${encodeURIComponent(id)}`;
      const message = await api<Message>("GET", path);
      const thread = await api<Message[]>("GET", `${path}/thread`);
      const taskIds = [...new Set(thread.flatMap((entry) => (entry.taskId ? [entry.taskId] : [])))];
      const tasks = await Promise.all(
        taskIds.map((taskId) =>
          api<{ id: string; title: string }>("GET", `/tasks/${encodeURIComponent(taskId)}`),
        ),
      );
      output(
        program.opts().json,
        { message, thread, tasks },
        [
          ...thread.map(
            (entry) =>
              `${entry.id} · ${entry.subject}\n${entry.body}${entry.taskId ? `\n任务: ${entry.taskId}` : ""}`,
          ),
          ...tasks.map((task) => `${task.id} · ${task.title}`),
        ].join("\n\n"),
      );
      if (!options.peek) {
        const me = await api<{ id: string; capabilities: string[] }>("GET", "/agents/me");
        const recipient =
          message.to.kind === "broadcast" ||
          (message.to.kind === "agent"
            ? message.to.id === me.id
            : me.capabilities.includes(message.to.value));
        if (message.fromAgentId !== me.id && recipient)
          await api<Message>("POST", `${path}/read`, {});
      }
    });
}
