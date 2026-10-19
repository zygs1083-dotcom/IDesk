import { chmod, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, expect, it, vi } from "vitest";
import { findWakeCommand } from "./receiver.js";

const originalPath = process.env.PATH;
const originalPathExt = process.env.PATHEXT;
let directory: string;

afterEach(async () => {
  vi.restoreAllMocks();
  process.env.PATH = originalPath;
  if (originalPathExt === undefined) delete process.env.PATHEXT;
  else process.env.PATHEXT = originalPathExt;
  await rm(directory, { recursive: true, force: true });
});

it("ignores .cmd but accepts .exe for direct Windows spawn", async () => {
  directory = await mkdtemp(join(tmpdir(), "idesk-wake-path-"));
  process.env.PATH = directory;
  process.env.PATHEXT = ".CMD;.EXE";
  vi.spyOn(process, "platform", "get").mockReturnValue("win32");
  const cmd = join(directory, "codex.cmd");
  await writeFile(cmd, "");
  await chmod(cmd, 0o755);
  expect(await findWakeCommand("codex")).toBe(false);
  const exe = join(directory, "codex.exe");
  await writeFile(exe, "");
  await chmod(exe, 0o755);
  expect(await findWakeCommand("codex")).toBe(true);
});
