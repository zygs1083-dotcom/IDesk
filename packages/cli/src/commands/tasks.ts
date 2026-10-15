import { readFile } from "node:fs/promises";
import { labels } from "@idesk/shared/labels";

import type { Command } from "commander";
import { api } from "../client.js";
import { formatAgentName } from "../labels.js";
import { output } from "../output.js";

type Task = {
  id: string;
  title: string;
  status: keyof ReturnType<typeof labels>["status"];
  priority: keyof ReturnType<typeof labels>["priority"];
  capabilities: string[];
  assigneeId: string | null;
};
export function taskCommands(program: Command): void {
  program
    .command("tasks")
    .option("--status <status>")
    .option("--mine")
    .action(async (options: { status?: string; mine?: boolean }) => {
      const query = new URLSearchParams();
      if (options.status !== undefined) query.set("status", options.status);
      if (options.mine) {
        const me = await api<{ id: string }>("GET", "/agents/me");
        query.set("assignee", me.id);
      }
      const tasks = await api<Task[]>("GET", `/tasks?${query}`);
      if (program.opts().json) {
        output(true, tasks, "");
        return;
      }
      const agents = await api<{ id: string; name: string; host: string }[]>("GET", "/agents");
      output(false, tasks, [
        ["id", "状态", "优先级", "能力", "负责人", "标题"],
        ...tasks.map((task) => [
          task.id,
          labels("zh").status[task.status],
          labels("zh").priority[task.priority],
          task.capabilities.join(","),
          formatAgentName(task.assigneeId, agents),
          task.title,
        ]),
      ]);
    });

  program
    .command("publish")
    .requiredOption("--title <title>")
    .option("--body-file <path>")
    .option("--cap <capability...>")
    .option("--priority <priority>")
    .action(
      async (options: { title: string; bodyFile?: string; cap?: string[]; priority?: string }) => {
        const task = await api<Task>("POST", "/tasks", {
          title: options.title,
          body:
            options.bodyFile === undefined ? undefined : await readFile(options.bodyFile, "utf8"),
          capabilities: options.cap,
          priority: options.priority,
        });
        output(program.opts().json, task, `已发布 ${task.id} ${task.title}`);
      },
    );

  for (const [action, label] of [
    ["claim", "已领取"],
    ["accept", "已接受"],
    ["join", "已加入"],
    ["pause", "已暂停"],
    ["resume", "已恢复"],
    ["release", "已放回"],
  ] as const) {
    program.command(`${action} <id>`).action(async (id: string) => {
      const task = await api<Task>(
        "POST",
        `/tasks/${encodeURIComponent(id)}/actions/${action}`,
        {},
      );
      output(program.opts().json, task, `${label} ${task.id} ${task.title}`);
    });
  }

  program
    .command("report <id>")
    .requiredOption("-m, --message <message>")
    .action(async (id: string, options: { message: string }) => {
      const task = await api<Task>("POST", `/tasks/${encodeURIComponent(id)}/report`, {
        message: options.message,
      });
      output(program.opts().json, task, `已汇报 ${id}`);
    });

  program
    .command("done <id>")
    .requiredOption("--result-file <path>")
    .action(async (id: string, options: { resultFile: string }) => {
      const task = await api<Task>("POST", `/tasks/${encodeURIComponent(id)}/actions/complete`, {
        result: await readFile(options.resultFile, "utf8"),
      });
      output(program.opts().json, task, `已完成 ${task.id} ${task.title}`);
    });

  program
    .command("handoff <id>")
    .option("--to <agent>")
    .requiredOption("-m, --message <message>")
    .action(async (id: string, options: { to?: string; message: string }) => {
      const task = await api<Task>("POST", `/tasks/${encodeURIComponent(id)}/actions/handoff`, {
        to: options.to ?? null,
        note: options.message,
      });
      if (program.opts().json) {
        output(true, task, "");
        return;
      }
      const agents = await api<{ id: string; name: string; host: string }[]>("GET", "/agents");
      const recipient = options.to === undefined ? "待领取" : formatAgentName(options.to, agents);
      output(false, task, `已交接 ${task.id} → ${recipient}`);
    });
}
