import { readFileSync, statfsSync } from "node:fs";
import { cpus, hostname, release } from "node:os";

type CpuCounters = { idle: number; total: number };
type NetCounters = { rx: number; tx: number };

export function parseCpu(text: string): CpuCounters[] {
  return text
    .split("\n")
    .filter((line) => /^cpu\d*\s/.test(line))
    .map((line) => {
      const fields = line.trim().split(/\s+/).slice(1).map(Number);
      return {
        idle: Number(fields[3]) + Number(fields[4]),
        total: fields.slice(0, 8).reduce((sum, value) => sum + value, 0),
      };
    });
}

export function cpuPercent(before: CpuCounters[], after: CpuCounters[]): number[] {
  return after.map((current, index) => {
    const previous = before[index];
    if (!previous) return 0;
    const total = current.total - previous.total;
    const idle = current.idle - previous.idle;
    return total === 0 ? 0 : Math.max(0, Math.min(100, ((total - idle) / total) * 100));
  });
}

export function parseMem(text: string) {
  const values = new Map(
    text
      .split("\n")
      .filter(Boolean)
      .map((line) => {
        const [key, value] = line.split(/:\s*/);
        return [key, Number.parseInt(value as string, 10) * 1024] as const;
      }),
  );
  const memTotal = Number(values.get("MemTotal"));
  const swapTotal = Number(values.get("SwapTotal"));
  return {
    memUsed: memTotal - Number(values.get("MemAvailable")),
    memTotal,
    swapUsed: swapTotal - Number(values.get("SwapFree")),
    swapTotal,
  };
}

export function parseNet(text: string): NetCounters {
  let rx = 0;
  let tx = 0;
  for (const line of text.split("\n").slice(2)) {
    const colon = line.indexOf(":");
    if (colon < 0) continue;
    const name = line.slice(0, colon).trim();
    if (name === "lo" || /^(veth|docker|br-)/.test(name)) continue;
    const fields = line
      .slice(colon + 1)
      .trim()
      .split(/\s+/);
    rx += Number(fields[0]);
    tx += Number(fields[8]);
  }
  return { rx, tx };
}

export function netRate(before: NetCounters, after: NetCounters, seconds: number) {
  return {
    netRx: Math.max(0, (after.rx - before.rx) / seconds),
    netTx: Math.max(0, (after.tx - before.tx) / seconds),
  };
}

export function parseMounts(text: string) {
  const formats = new Set(["ext2", "ext3", "ext4", "xfs", "btrfs", "vfat", "f2fs"]);
  const devices = new Set<string>();
  const mounts: string[] = [];
  for (const line of text.split("\n")) {
    const [device, mount, type] = line.split(" ") as [string, string, string];
    if (!formats.has(type) || devices.has(device)) continue;
    devices.add(device);
    mounts.push(mount.replace(/\\040/g, " "));
  }
  return mounts;
}

export function parseLoad(text: string): [number, number, number] {
  const [one, five, fifteen] = text.trim().split(/\s+/);
  return [Number(one), Number(five), Number(fifteen)];
}

export function parseOsName(text: string): string {
  const line = text.split("\n").find((entry) => entry.startsWith("PRETTY_NAME="));
  return line ? line.slice("PRETTY_NAME=".length).replace(/^"|"$/g, "") : "Linux";
}

async function main() {
  if (process.platform !== "linux") {
    process.stderr.write("idesk probe 目前只支持 Linux\n");
    process.exitCode = 1;
    return;
  }
  const args = process.argv.slice(2);
  const urlIndex = args.indexOf("--url");
  const tokenIndex = args.indexOf("--token-file");
  if (urlIndex < 0 || tokenIndex < 0 || !args[urlIndex + 1] || !args[tokenIndex + 1]) {
    process.stderr.write("Usage: probe.mjs --url <IDesk URL> --token-file <path>\n");
    process.exitCode = 1;
    return;
  }
  const url = String(args[urlIndex + 1]).replace(/\/$/, "");
  const token = readFileSync(String(args[tokenIndex + 1]), "utf8").trim();
  const cpuInfo = cpus();
  const info = {
    hostname: hostname(),
    os: parseOsName(readFileSync("/etc/os-release", "utf8")),
    kernel: release(),
    cpuModel: (cpuInfo[0] as (typeof cpuInfo)[number]).model,
    cpuCount: cpuInfo.length,
  };
  let previousCpu = parseCpu(readFileSync("/proc/stat", "utf8"));
  let previousNet = parseNet(readFileSync("/proc/net/dev", "utf8"));
  let previousTime = Date.now();
  setInterval(async () => {
    const now = Date.now();
    const currentCpu = parseCpu(readFileSync("/proc/stat", "utf8"));
    const currentNet = parseNet(readFileSync("/proc/net/dev", "utf8"));
    const cpuValues = cpuPercent(previousCpu, currentCpu);
    const network = netRate(previousNet, currentNet, (now - previousTime) / 1000);
    previousCpu = currentCpu;
    previousNet = currentNet;
    previousTime = now;
    const disks = parseMounts(readFileSync("/proc/mounts", "utf8")).map((mount) => {
      const stat = statfsSync(mount);
      return {
        mount,
        used: (stat.blocks - stat.bfree) * stat.bsize,
        total: stat.blocks * stat.bsize,
      };
    });
    const body = {
      info,
      cpu: Number(cpuValues[0]),
      cores: cpuValues.slice(1),
      load: parseLoad(readFileSync("/proc/loadavg", "utf8")),
      ...parseMem(readFileSync("/proc/meminfo", "utf8")),
      disks,
      ...network,
      uptime: Number(readFileSync("/proc/uptime", "utf8").split(" ")[0]),
    };
    try {
      const response = await fetch(`${url}/api/probe/v1/samples`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
    } catch (error) {
      process.stderr.write(
        `idesk probe: ${error instanceof Error ? error.message : String(error)}\n`,
      );
    }
  }, 10_000);
}

if (process.argv[1]?.endsWith("probe.mjs")) void main();
