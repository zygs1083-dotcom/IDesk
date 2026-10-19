import { expect, test } from "vitest";
import {
  cpuPercent,
  netRate,
  parseCpu,
  parseLoad,
  parseMem,
  parseMounts,
  parseNet,
} from "./probe.ts";

test("proc stat total and per-core deltas", () => {
  const before = parseCpu(
    "cpu  10 0 10 80 0 0 0 0 2 0\ncpu0 5 0 5 40 0 0 0 0\ncpu1 5 0 5 40 0 0 0 0\nintr 0\n",
  );
  const after = parseCpu(
    "cpu  20 0 20 110 0 0 0 0 4 0\ncpu0 15 0 10 45 0 0 0 0\ncpu1 5 0 10 65 0 0 0 0\n",
  );
  const [total, first, second] = cpuPercent(before, after);
  expect(total).toBe(40);
  expect(first).toBe(75);
  expect(second).toBeCloseTo(16.6667);
});

test("meminfo bytes, network rates, mounted devices, and load", () => {
  expect(
    parseMem("MemTotal: 1000 kB\nMemAvailable: 250 kB\nSwapTotal: 200 kB\nSwapFree: 50 kB\n"),
  ).toEqual({
    memUsed: 750 * 1024,
    memTotal: 1000 * 1024,
    swapUsed: 150 * 1024,
    swapTotal: 200 * 1024,
  });
  const header =
    "Inter-| Receive | Transmit\n face |bytes packets errs drop fifo frame compressed multicast|bytes packets errs drop fifo colls carrier compressed\n";
  const before = parseNet(
    `${header}  lo: 100 0 0 0 0 0 0 0 100 0 0 0 0 0 0 0\neth0: 100 0 0 0 0 0 0 0 200 0 0 0 0 0 0 0\nveth1: 1000 0 0 0 0 0 0 0 1000 0 0 0 0 0 0 0\n`,
  );
  const after = parseNet(
    `${header}  lo: 200 0 0 0 0 0 0 0 200 0 0 0 0 0 0 0\neth0: 160 0 0 0 0 0 0 0 260 0 0 0 0 0 0 0\nveth1: 2000 0 0 0 0 0 0 0 2000 0 0 0 0 0 0 0\n`,
  );
  expect(netRate(before, after, 2)).toEqual({ netRx: 30, netTx: 30 });
  expect(
    parseMounts(
      "/dev/sda1 / ext4 rw 0 0\n/dev/sda1 /bind ext4 rw 0 0\n/dev/sdb1 /data\\040disk xfs rw 0 0\ntmpfs /tmp tmpfs rw 0 0\n",
    ),
  ).toEqual(["/", "/data disk"]);
  expect(parseLoad("1.25 2.50 3.75 1/100 1234")).toEqual([1.25, 2.5, 3.75]);
});
