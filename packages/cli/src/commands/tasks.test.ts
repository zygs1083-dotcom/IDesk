import { mkdtemp, rm } from "node:fs/promises";
import { createServer, type Server } from "node:http";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Command } from "commander";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { saveConfig } from "../config.js";
import { taskCommands } from "./tasks.js";

let home: string;
let originalHome: string | undefined;
let server: Server;

beforeEach(async () => {
  home = await mkdtemp(join(tmpdir(), "idesk-task-"));
  originalHome = process.env.HOME;
  process.env.HOME = home;
  const events = Array.from({ length: 12 }, (_, index) => ({
    id: `event-${String(index + 1).padStart(2, "0")}`,
    ts: new Date(Date.UTC(2026, 9, 19, 0, index)).toISOString(),
    type: `task.event${String(index + 1).padStart(2, "0")}`,
    agentId: null,
  }));
  server = createServer((req, res) => {
    res.setHeader("Content-Type", "application/json");
    if (req.url === "/api/v1/tasks/task-1/events") {
      res.end(JSON.stringify(events));
    } else if (req.url === "/api/v1/tasks/task-1") {
      res.end(
        JSON.stringify({
          id: "task-1",
          title: "Test task",
          status: "assigned",
          assigneeId: null,
          body: "Body",
        }),
      );
    } else {
      res.end("[]");
    }
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  if (typeof address !== "object" || !address) throw new Error("server missing");
  await saveConfig({ url: `http://127.0.0.1:${address.port}`, key: "test-key" });
});

afterEach(async () => {
  vi.restoreAllMocks();
  await new Promise<void>((resolve) => server.close(() => resolve()));
  if (originalHome === undefined) delete process.env.HOME;
  else process.env.HOME = originalHome;
  await rm(home, { recursive: true, force: true });
});

it("shows the latest 10 of 12 ascending task events in text and JSON", async () => {
  const chunks: string[] = [];
  vi.spyOn(process.stdout, "write").mockImplementation((chunk) => {
    chunks.push(String(chunk));
    return true;
  });
  const program = new Command().option("--json");
  taskCommands(program);
  await program.parseAsync(["task", "task-1"], { from: "user" });
  const text = chunks.join("");
  expect(text).not.toContain("task.event01");
  expect(text).not.toContain("task.event02");
  expect(text).toContain("task.event03");
  expect(text).toContain("task.event12");
  expect(text.indexOf("task.event03")).toBeLessThan(text.indexOf("task.event12"));

  chunks.length = 0;
  const jsonProgram = new Command().option("--json");
  taskCommands(jsonProgram);
  await jsonProgram.parseAsync(["--json", "task", "task-1"], { from: "user" });
  const parsed = JSON.parse(chunks.join("")) as { events: { id: string }[] };
  expect(parsed.events.map((event) => event.id)).toEqual(
    Array.from({ length: 10 }, (_, index) => `event-${String(index + 3).padStart(2, "0")}`),
  );
});
