import { spawn } from "node:child_process";
import { appendFileSync, mkdirSync } from "node:fs";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { api } from "./client.js";
import { type Config, configDir } from "./config.js";
import { version } from "./version.js";

export type ReceiverConfig = {
  listen: string;
  publicUrl: string;
  wake: string[];
  wakeOnOpen: boolean;
};
export type Event = {
  id: string;
  ts: string;
  type: string;
  taskId: string | null;
  agentId: string | null;
  payload: Record<string, unknown>;
};
export type EventState = {
  id: string;
  type: string;
  taskId: string | null;
  state: "received" | "woken" | "skipped" | "failed";
  at: string;
};
export type ReceiverState = { events: EventState[]; inProgressSince: Record<string, string> };
type Agent = { id: string; name: string; capabilities: string[] };
type Task = { id: string; status: string; assigneeId: string | null };
type Api = <T>(method: string, path: string, body?: object) => Promise<T>;
type Log = (message: string) => void;
const statePath = () => join(configDir(), "receiver", "state.json");

export async function readReceiverConfig(): Promise<ReceiverConfig> {
  try {
    return JSON.parse(await readFile(join(configDir(), "receiver.json"), "utf8")) as ReceiverConfig;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT")
      throw new Error("找不到 receiver.json，先运行 idesk receiver init");
    throw error;
  }
}

export function receiverClient(config: ReceiverConfig): string {
  const wake = config.wake[0] === "codex" && config.wake[1] === "queue" ? "codex" : "command";
  return `idesk-receiver/${version} (${process.platform}; wake=${wake})`;
}

export function logLine(message: string): void {
  const line = `${new Date().toISOString()} ${message}\n`;
  process.stdout.write(line);
  if (process.platform === "win32") {
    const dir = join(configDir(), "receiver");
    mkdirSync(dir, { recursive: true });
    appendFileSync(join(dir, "receiver.log"), line);
  }
}

export async function wakeCommand(
  argv: string[],
  prompt: string,
  timeoutMs = 60_000,
  log: Log = logLine,
): Promise<boolean> {
  return new Promise((resolve) => {
    const child = spawn(
      argv[0] as string,
      argv.slice(1).map((arg) => arg.replaceAll("{prompt}", prompt)),
      { stdio: ["ignore", "pipe", "pipe"] },
    );
    child.stdout.on("data", (chunk: Buffer) => log(`唤醒输出 ${chunk.toString().trimEnd()}`));
    child.stderr.on("data", (chunk: Buffer) => log(`唤醒输出 ${chunk.toString().trimEnd()}`));
    let settled = false;
    const finish = (ok: boolean, result: string) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      log(`唤醒 ${result}`);
      resolve(ok);
    };
    const timer = setTimeout(() => finish(true, "仍在运行，视为成功"), timeoutMs);
    child.on("error", (error) => finish(false, `启动失败 ${error.message}`));
    child.on("exit", (code) => finish(code === 0, `退出码 ${code}`));
  });
}

export class Receiver {
  readonly state: ReceiverState;
  readonly lastWoken = new Map<string, number>();
  readonly pendingTasks = new Map<string, number>();
  readonly processing = new Set<Promise<void>>();
  private writes: Promise<void> = Promise.resolve();
  private queue: Promise<void> = Promise.resolve();
  constructor(
    readonly config: ReceiverConfig,
    readonly credentials: Config,
    readonly me: Agent,
    state: ReceiverState,
    readonly request: Api = api,
    readonly log: Log = logLine,
    readonly now: () => number = Date.now,
    readonly wake: typeof wakeCommand = wakeCommand,
  ) {
    this.state = state;
  }
  static async create(
    config: ReceiverConfig,
    credentials: Config,
    request: Api = api,
    log: Log = logLine,
    now: () => number = Date.now,
    wake: typeof wakeCommand = wakeCommand,
  ): Promise<Receiver> {
    const me = await request<Agent>("GET", "/agents/me");
    let state: ReceiverState;
    try {
      state = JSON.parse(await readFile(statePath(), "utf8")) as ReceiverState;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
      state = { events: [], inProgressSince: {} };
    }
    return new Receiver(config, credentials, me, state, request, log, now, wake);
  }
  async save(): Promise<void> {
    const snapshot = JSON.stringify(this.state);
    this.writes = this.writes.then(async () => {
      await mkdir(join(configDir(), "receiver"), { recursive: true });
      await writeFile(`${statePath()}.tmp`, snapshot, { mode: 0o600 });
      await rename(`${statePath()}.tmp`, statePath());
    });
    return this.writes;
  }
  enqueue(prompt: string, taskId?: string, event?: EventState): void {
    if (taskId) this.pendingTasks.set(taskId, (this.pendingTasks.get(taskId) ?? 0) + 1);
    this.queue = this.queue
      .then(async () => {
        const ok = await this.wake(this.config.wake, prompt, 60_000, this.log);
        if (event) {
          event.state = ok ? "woken" : "failed";
          await this.save();
          this.log(`事件 ${event.id} ${event.type} ${event.state}`);
        }
        if (taskId) {
          if (ok) this.lastWoken.set(taskId, this.now());
        }
      })
      .catch(async (error: Error) => {
        if (event) {
          event.state = "failed";
          await this.save();
          this.log(`事件 ${event.id} ${event.type} failed`);
        }
        this.log(`唤醒处理失败 ${error.message}`);
      })
      .finally(() => {
        if (taskId) {
          const remaining = (this.pendingTasks.get(taskId) ?? 1) - 1;
          if (remaining === 0) this.pendingTasks.delete(taskId);
          else this.pendingTasks.set(taskId, remaining);
        }
      });
  }
  async process(event: Event, entry: EventState): Promise<void> {
    const origin = this.credentials.url;
    let prompt: string | undefined;
    if ((event.type === "task.assign" || event.type === "task.handoff") && event.taskId) {
      const task = await this.request<Task>("GET", `/tasks/${encodeURIComponent(event.taskId)}`);
      if (task.status === "assigned" && task.assigneeId === this.me.id)
        prompt = `IDesk：任务 ${event.taskId} 已指派给你（${event.type}，事件 ${event.id}）。按 ${origin}/agent-guide.md 第 5 节处理。`;
    } else if (event.type === "relay.sent" && typeof event.payload.messageId === "string") {
      prompt = `IDesk：你收到传递区消息 ${event.payload.messageId}。按 ${origin}/agent-guide.md 第 6 节处理。`;
    } else if (event.type === "task.created" && this.config.wakeOnOpen && event.taskId) {
      const task = await this.request<Task>("GET", `/tasks/${encodeURIComponent(event.taskId)}`);
      if (task.status === "open")
        prompt = `IDesk：有一个你能领的新任务 ${event.taskId}。空闲时按 ${origin}/agent-guide.md 第 5 节领取。`;
    }
    if (prompt) this.enqueue(prompt, event.taskId ?? undefined, entry);
    else {
      entry.state = "skipped";
      await this.save();
      this.log(`事件 ${event.id} ${event.type} skipped`);
    }
  }
  async idle(): Promise<void> {
    await Promise.all(this.processing);
    await this.queue;
  }
}
