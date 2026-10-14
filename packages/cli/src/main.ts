#!/usr/bin/env node
import { Command } from "commander";

const program = new Command("idesk").description("IDesk 命令行").version("0.1.0");

program
  .command("tasks")
  .description("列出任务")
  .action(() => {
    console.log("not implemented");
  });

program.parse();
