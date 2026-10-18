import { Command } from "commander";
import { beforeEach, expect, test, vi } from "vitest";
import { api } from "../client.js";
import { output } from "../output.js";
import { relayCommands } from "./relay.js";

vi.mock("../client.js", () => ({ api: vi.fn() }));
vi.mock("../output.js", () => ({ output: vi.fn() }));
const message = {
  id: "target",
  kind: "request",
  fromAgentId: "sender",
  to: { kind: "agent", id: "reader" },
  subject: "Subject",
  body: "Full body",
  readBy: [],
  createdAt: new Date().toISOString(),
  taskId: "task",
  replyTo: null,
};
function run(...args: string[]) {
  const program = new Command().option("--json");
  relayCommands(program);
  return program.parseAsync(args, { from: "user" });
}
beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(api).mockImplementation(async (method, path) => {
    if (path === "/agents/me") return { id: "reader", capabilities: ["coding"] };
    if (path === "/agents") return [];
    if (path === "/relay?box=inbox")
      return [message, { ...message, id: "read", readBy: ["reader"] }];
    if (path.endsWith("/thread")) return [message, { ...message, id: "reply", kind: "reply" }];
    if (path === "/tasks/task") return { id: "task", title: "Task title" };
    if (method === "POST" || path === "/relay/target") return message;
    throw new Error(`Unexpected ${method} ${path}`);
  });
});
test.each([[[]], [["--json"]], [["--all"]], [["--all", "--json"]]])(
  "inbox is read-only with %j",
  async (flags) => {
    await run("relay", "inbox", ...flags);
    expect(vi.mocked(api).mock.calls.every(([method]) => method === "GET")).toBe(true);
    expect(vi.mocked(output).mock.calls[0]?.[1]).toHaveLength(flags.includes("--all") ? 2 : 1);
    if (flags.includes("--json"))
      expect(vi.mocked(output).mock.calls[0]?.[1]).toEqual(expect.arrayContaining([message]));
  },
);
test("read prints full thread and task then marks only its target", async () => {
  await run("relay", "read", "target");
  expect(vi.mocked(api).mock.calls.filter(([method]) => method === "POST")).toEqual([
    ["POST", "/relay/target/read", {}],
  ]);
  expect(vi.mocked(output).mock.calls[0]?.[2]).toContain("Full body");
  expect(vi.mocked(output).mock.calls[0]?.[2]).toContain("Task title");
});
test("peek does not mark", async () => {
  await run("--json", "relay", "read", "target", "--peek");
  expect(vi.mocked(api).mock.calls.every(([method]) => method === "GET")).toBe(true);
});
test("a sender reading their own message does not mark it", async () => {
  vi.mocked(api).mockImplementation(async (_method, path) => {
    if (path === "/agents/me") return { id: "sender", capabilities: [] };
    if (path.endsWith("/thread")) return [];
    return message;
  });
  await run("relay", "read", "target");
  expect(vi.mocked(api).mock.calls.every(([method]) => method === "GET")).toBe(true);
});
test.each([
  [[], "reply"],
  [["--kind", "note"], "note"],
] as const)("reply-to respects explicit kind %j", async (flags, kind) => {
  await run(
    "relay",
    "send",
    "--to",
    "reader",
    "--subject",
    "Reply",
    "--reply-to",
    "target",
    ...flags,
  );
  expect(api).toHaveBeenCalledWith(
    "POST",
    "/relay",
    expect.objectContaining({ replyTo: "target", kind }),
  );
});

test("human recipient and inferred reply recipient", async () => {
  await run("relay", "send", "--human", "--subject", "Approval");
  expect(api).toHaveBeenLastCalledWith(
    "POST",
    "/relay",
    expect.objectContaining({ to: { kind: "human" } }),
  );
  await run("relay", "send", "--reply-to", "target", "--subject", "Answer");
  expect(api).toHaveBeenLastCalledWith(
    "POST",
    "/relay",
    expect.objectContaining({ to: undefined, replyTo: "target" }),
  );
  await expect(run("relay", "send", "--human", "--all", "--subject", "Invalid")).rejects.toThrow();
  await expect(run("relay", "send", "--subject", "Invalid")).rejects.toThrow();
});
