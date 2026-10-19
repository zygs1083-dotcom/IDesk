#!/usr/bin/env node
import { Command } from "commander";
import { receiverCommands } from "./commands/receiver.js";
import { relayCommands } from "./commands/relay.js";
import { taskCommands } from "./commands/tasks.js";
import { type Config, saveConfig } from "./config.js";
import { mcpBridge } from "./mcp-bridge.js";
import { version } from "./version.js";

const program = new Command("idesk")
  .description("IDesk 命令行")
  .version(version)
  .option("--json", "输出原始 JSON");

program
  .command("login")
  .requiredOption("--url <url>")
  .requiredOption("--key <key>")
  .action(async (options: Config) => {
    const path = await saveConfig({ url: options.url.replace(/\/+$/, ""), key: options.key });
    process.stdout.write(`已保存到 ${path}\n`);
  });
taskCommands(program);
relayCommands(program);
receiverCommands(program);
program.command("mcp").description("stdio ↔ HTTP MCP 桥").action(mcpBridge);

program.parseAsync().catch((e: Error) => {
  process.stderr.write(`${e.message}\n`);
  process.exit(1);
});
