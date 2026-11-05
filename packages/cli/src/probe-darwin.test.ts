import { expect, test } from "vitest";
import { cpuPercent } from "./probe.ts";
import { cpuCounters, parseMountList, parseNetstat, parseVmStat } from "./probe-darwin.ts";

const core = (user: number, sys: number, idle: number) => ({
  model: "Apple M1",
  speed: 2400,
  times: { user, nice: 0, sys, idle, irq: 0 },
});

test("os.cpus times become a total row followed by per-core rows", () => {
  const before = cpuCounters([core(100, 100, 800), core(0, 0, 1000)]);
  const after = cpuCounters([core(250, 150, 1000), core(50, 0, 1150)]);
  const [total, first, second] = cpuPercent(before, after);
  expect(total).toBeCloseTo(41.6667);
  expect(first).toBe(50);
  expect(second).toBe(25);
});

test("vm_stat and vm.swapusage match Activity Monitor memory used", () => {
  const vmStat = `Mach Virtual Memory Statistics: (page size of 16384 bytes)
Pages free:                               19669.
Pages active:                            119382.
Pages inactive:                          118590.
Pages speculative:                          364.
Pages wired down:                         90001.
Pages purgeable:                            243.
File-backed pages:                        92651.
Anonymous pages:                         145685.
Pages stored in compressor:              380497.
Pages occupied by compressor:            140578.
`;
  expect(
    parseVmStat(
      vmStat,
      "total = 2048.00M  used = 525.94M  free = 1522.06M  (encrypted)\n",
      8 * 2 ** 30,
    ),
  ).toEqual({
    memUsed: (145685 - 243 + 90001 + 140578) * 16384,
    memTotal: 8 * 2 ** 30,
    swapUsed: Math.round(525.94 * 2 ** 20),
    swapTotal: 2 * 2 ** 30,
  });
  expect(parseVmStat(vmStat, "total = 0.00M  used = 0.00M  free = 0.00M\n", 1024).memUsed).toBe(
    1024,
  );
});

test("netstat counts physical en* links once, skipping loopback, tunnels, and address rows", () => {
  const text = `Name       Mtu   Network       Address            Ipkts Ierrs     Ibytes    Opkts Oerrs     Obytes  Coll
lo0        16384 <Link#1>                       7911388     0 21143755517  7911388     0 21143755517     0
lo0        16384 127           127.0.0.1        7911388     - 21143755517  7911388     - 21143755517     -
gif0*      1280  <Link#2>                             0     0          0        0     0          0     0
en0        1500  <Link#11>   7a:4a:42:65:dc:68   900000     0  500000000   400000     0   20000000     0
en0        1500  192.168.1     192.168.1.20       900000     - 500000000   400000     -   20000000     -
en1        1500  <Link#8>    36:89:fb:0a:20:c0      10     0       1000       10     0       2000     0
bridge0    1500  <Link#12>   36:89:fb:0a:20:c0      10     0       1000       10     0       2000     0
utun3      1380  <Link#20>                          50     0       7000       50     0       9000     0
awdl0      1500  <Link#13>   aa:bb:cc:dd:ee:ff      5     0        500        5     0        500     0
`;
  expect(parseNetstat(text)).toEqual({ rx: 500001000, tx: 20002000 });
});

test("mount keeps one browsable local volume per disk", () => {
  const text = `/dev/disk3s3s1 on / (apfs, sealed, local, read-only, journaled)
devfs on /dev (devfs, local, nobrowse)
/dev/disk3s6 on /System/Volumes/VM (apfs, local, noexec, journaled, noatime, nobrowse)
/dev/disk1s2 on /System/Volumes/xarts (apfs, local, noexec, journaled, noatime, nobrowse)
/dev/disk3s1 on /System/Volumes/Data (apfs, local, journaled, nobrowse, protect, root data)
map auto_home on /System/Volumes/Data/home (autofs, automounted, nobrowse)
/dev/disk2s1 on /System/Volumes/Update/SFR/mnt1 (apfs, local, journaled, nobrowse)
/dev/disk5s1 on /Volumes/Backup Disk (apfs, local, nodev, nosuid, journaled, noowners)
/dev/disk5s2 on /Volumes/Backup Data (apfs, local, nodev, nosuid, journaled, noowners)
/dev/disk6s1 on /Volumes/USB (msdos, local, nodev, nosuid, noowners)
//user@nas/share on /Volumes/share (smbfs, nodev, nosuid, mounted by user)
`;
  expect(parseMountList(text)).toEqual(["/", "/Volumes/Backup Disk", "/Volumes/USB"]);
});
