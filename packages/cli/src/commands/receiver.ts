import { constants } from "node:fs";
import { access, chmod, mkdir, readFile, stat, writeFile } from "node:fs/promises";
import { delimiter, dirname, isAbsolute, join } from "node:path";
import type { Command } from "commander";
import { api } from "../client.js";
import { configDir } from "../config.js";
import { type ReceiverConfig, readReceiverConfig } from "../receiver.js";
import { runReceiver } from "../receiver-run.js";
import { version } from "../version.js";

type Agent = { name: string; capabilities: string[]; webhookUrl: string | null };
type TestResult = {
  ok: boolean;
  status: number | null;
  durationMs: number;
  error: string | null;
  notifierEnabled: boolean;
};
type InitOptions = {
  listen: string;
  publicUrl?: string;
  codexThread?: string;
  wake?: string;
  wakeOnOpen?: boolean;
};

export async function initReceiver(options: InitOptions): Promise<string> {
  if (Number(options.codexThread !== undefined) + Number(options.wake !== undefined) !== 1)
    throw new Error("--codex-thread 和 --wake 必须且只能给一个");
  let wake: string[];
  if (options.codexThread !== undefined)
    wake = ["codex", "queue", "--thread", options.codexThread, "--message", "{prompt}"];
  else {
    let parsed: unknown;
    try {
      parsed = JSON.parse(options.wake as string);
    } catch {
      throw new Error("--wake 必须是包含 {prompt} 的 JSON 字符串数组");
    }
    if (
      !Array.isArray(parsed) ||
      parsed.length === 0 ||
      !parsed.every((item) => typeof item === "string") ||
      !parsed.some((item) => item.includes("{prompt}"))
    )
      throw new Error("--wake 必须是包含 {prompt} 的 JSON 字符串数组");
    wake = parsed;
  }
  const [host, port] = options.listen.split(":");
  if (!host || !port || !Number.isInteger(Number(port)) || Number(port) < 1 || Number(port) > 65535)
    throw new Error("--listen 格式应为 host:port");
  const publicUrl = options.publicUrl ?? `http://${options.listen}/`;
  const url = new URL(publicUrl);
  if (url.protocol !== "http:" && url.protocol !== "https:")
    throw new Error("--public-url 必须是 HTTP 地址");
  const config: ReceiverConfig = {
    listen: options.listen,
    publicUrl,
    wake,
    wakeOnOpen: options.wakeOnOpen ?? false,
  };
  const path = join(configDir(), "receiver.json");
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, JSON.stringify(config, null, 2), { mode: 0o600 });
  await chmod(path, 0o600);
  await api("PATCH", "/agents/me", { webhookUrl: publicUrl });
  return path;
}

export async function findWakeCommand(command: string): Promise<boolean> {
  const paths = isAbsolute(command)
    ? [command]
    : (process.env.PATH ?? "").split(delimiter).map((dir) => join(dir, command));
  const extensions = process.platform === "win32" ? ["", ".exe", ".com"] : [""];
  for (const path of paths)
    for (const extension of extensions) {
      const candidate = path + extension;
      const [permission, file] = await Promise.allSettled([
        access(candidate, constants.X_OK),
        stat(candidate),
      ]);
      if (permission.status === "fulfilled" && file.status === "fulfilled" && file.value.isFile())
        return true;
    }
  return false;
}

export async function checkReceiver(
  write: (line: string) => void = (line) => process.stdout.write(`${line}\n`),
): Promise<boolean> {
  write(`IDesk CLI ${version}`);
  let me: Agent;
  try {
    me = await api<Agent>("GET", "/agents/me");
    write(`✓ key 有效：${me.name}（${me.capabilities.join("、") || "—"}）`);
  } catch (error) {
    write(`✗ key 无效：${(error as Error).message}`);
    return false;
  }
  let ok = true;
  try {
    await api("POST", "/agents/me/heartbeat", {});
    write("✓ 在线心跳正常");
  } catch (error) {
    write(`✗ 在线心跳失败：${(error as Error).message}`);
    ok = false;
  }
  let config: ReceiverConfig | undefined;
  let configError: string | undefined;
  try {
    config = await readReceiverConfig();
  } catch (error) {
    if (!(error as Error).message.includes("找不到 receiver.json"))
      configError = (error as Error).message;
  }
  if (me.webhookUrl) {
    write(`✓ webhook 地址已登记：${config?.publicUrl ?? me.webhookUrl}`);
    try {
      const result = await api<TestResult>("POST", "/agents/me/webhook-test", {});
      if (!result.notifierEnabled) {
        write("✗ 测试推送：Webhook 推送插件已停用");
        ok = false;
      } else if (result.ok)
        write(`✓ 测试推送：接收端响应 ${result.status}，用时 ${result.durationMs} ms`);
      else {
        write(`✗ 测试推送：${result.error ?? `接收端响应 ${result.status}`}`);
        ok = false;
      }
    } catch (error) {
      write(`✗ 测试推送：${(error as Error).message}`);
      ok = false;
    }
  } else {
    write("✗ webhook 地址未登记：先运行 idesk receiver init");
    write("✗ 测试推送：先运行 idesk receiver init");
    ok = false;
  }
  if (configError) {
    write(`✗ receiver.json 无效：${configError}`);
    ok = false;
  } else if (!config) write("没有 receiver.json，跳过唤醒命令检查");
  else if (await findWakeCommand(config.wake[0] as string))
    write(`✓ 唤醒命令可执行：${config.wake[0]}`);
  else {
    const hint =
      process.platform === "win32"
        ? '（Windows 上 npm 安装的命令是 .cmd，要写成 ["cmd","/c",...]）'
        : "";
    write(`✗ 唤醒命令不可执行：${config.wake[0]}${hint}`);
    ok = false;
  }
  return ok;
}

export function receiverCommands(program: Command): void {
  const receiver = program.command("receiver");
  receiver
    .command("init")
    .requiredOption("--listen <host:port>")
    .option("--public-url <url>")
    .option("--codex-thread <id>")
    .option("--wake <json>")
    .option("--wake-on-open")
    .action(async (options: InitOptions) => {
      const path = await initReceiver(options);
      const config = JSON.parse(await readFile(path, "utf8")) as ReceiverConfig;
      process.stdout.write(
        `已写入 ${path}\n已登记 webhook 地址：${config.publicUrl}\n下一步：按规范第 3 节配置常驻运行，然后 idesk receiver check\n`,
      );
    });
  receiver.command("run").action(runReceiver);
  receiver.command("check").action(async () => {
    if (!(await checkReceiver())) process.exitCode = 1;
  });
}
