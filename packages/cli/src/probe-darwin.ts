import { execFileSync } from "node:child_process";
import { cpus, loadavg, release, totalmem, uptime } from "node:os";
import type { CpuCounters, NetCounters, Platform } from "./probe.ts";

function run(file: string, ...args: string[]): string {
  return execFileSync(file, args, { encoding: "utf8" });
}

/** 第一项是全部核之和，与 Linux /proc/stat 的 cpu 行对应 */
export function cpuCounters(list: ReturnType<typeof cpus>): CpuCounters[] {
  const cores = list.map(({ times }) => ({
    idle: times.idle,
    total: times.user + times.nice + times.sys + times.idle + times.irq,
  }));
  return [
    {
      idle: cores.reduce((sum, core) => sum + core.idle, 0),
      total: cores.reduce((sum, core) => sum + core.total, 0),
    },
    ...cores,
  ];
}

/** 已用 = App 内存（匿名页 − 可清除页）+ 联动内存 + 压缩占用，与「活动监视器」的「已使用内存」一致 */
export function parseVmStat(vmStat: string, swapUsage: string, memTotal: number) {
  const pageSize = Number(/page size of (\d+) bytes/.exec(vmStat)?.[1]);
  const pages = (label: string) =>
    Number(new RegExp(`^${label}:\\s+(\\d+)`, "m").exec(vmStat)?.[1] ?? 0);
  const used =
    (pages("Anonymous pages") -
      pages("Pages purgeable") +
      pages("Pages wired down") +
      pages("Pages occupied by compressor")) *
    pageSize;
  const swap = (key: string) => {
    const match = new RegExp(`${key} = ([\\d.]+)([KMG])`).exec(swapUsage);
    return match ? Math.round(Number(match[1]) * 1024 ** ("KMG".indexOf(String(match[2])) + 1)) : 0;
  };
  return {
    memUsed: Math.max(0, Math.min(memTotal, used)),
    memTotal,
    swapUsed: swap("used"),
    swapTotal: swap("total"),
  };
}

/** `netstat -ibn` 每块网卡的 <Link#> 行；只算物理网卡 en*，跳过回环、隧道、AirDrop 和网桥 */
export function parseNetstat(text: string): NetCounters {
  let rx = 0;
  let tx = 0;
  for (const line of text.split("\n")) {
    const fields = line.trim().split(/\s+/);
    if (!fields[2]?.startsWith("<Link#") || !/^en\d+$/.test(String(fields[0]))) continue;
    rx += Number(fields.at(-5));
    tx += Number(fields.at(-2));
  }
  return { rx, tx };
}

/**
 * `mount` 输出中可浏览的本地卷。APFS 同一容器里的卷共享空间，按 diskN 去重，
 * 根卷 statfs 得到的是整个容器的总量与剩余。
 */
export function parseMountList(text: string): string[] {
  const formats = new Set(["apfs", "hfs", "exfat", "msdos", "ntfs"]);
  const containers = new Set<string>();
  const mounts: string[] = [];
  for (const line of text.split("\n")) {
    const match = /^(\S+) on (.+) \(([^)]*)\)$/.exec(line);
    if (!match) continue;
    const [, device = "", mount = "", options = ""] = match;
    const flags = options.split(", ");
    if (!formats.has(String(flags[0])) || !flags.includes("local") || flags.includes("nobrowse"))
      continue;
    const container = /disk\d+/.exec(device)?.[0] ?? device;
    if (containers.has(container)) continue;
    containers.add(container);
    mounts.push(mount);
  }
  return mounts;
}

export const darwin: Platform = {
  os: () => `${run("sw_vers", "-productName").trim()} ${run("sw_vers", "-productVersion").trim()}`,
  kernel: () => `Darwin ${release()}`,
  cpu: () => cpuCounters(cpus()),
  net: () => parseNetstat(run("netstat", "-ibn")),
  load: () => loadavg() as [number, number, number],
  memory: () => parseVmStat(run("vm_stat"), run("sysctl", "-n", "vm.swapusage"), totalmem()),
  mounts: () => parseMountList(run("mount")),
  uptime: () => uptime(),
};
