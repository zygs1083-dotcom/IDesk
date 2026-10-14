import { readFile } from "node:fs/promises";
import type { Command } from "commander";
import { api } from "../client.js";
import { formatTime, kindLabels } from "../labels.js";
import { output } from "../output.js";

type Message = {
  id: string;
  kind: keyof typeof kindLabels;
  fromAgentId: string;
  subject: string;
  createdAt: string;
  readBy: string[];
};

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
    .option("--kind <kind>", "消息种类", "note")
    .action(
      async (options: {
        to?: string;
        cap?: string;
        all?: boolean;
        subject: string;
        bodyFile?: string;
        task?: string;
        kind: string;
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
          kind: options.kind,
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
      for (const message of messages) {
        await api<Message>("POST", `/relay/${encodeURIComponent(message.id)}/read`, {});
      }
      output(program.opts().json, messages, [
        ["id", "种类", "发送者", "标题", "时间"],
        ...messages.map((message) => [
          message.id,
          kindLabels[message.kind],
          message.fromAgentId,
          message.subject,
          formatTime(message.createdAt),
        ]),
      ]);
    });
}
