import type { relayMessageSchema } from "@idesk/shared/relay-schemas";
import { describe, expect, it } from "vitest";
import type { z } from "zod";
import { relayThread } from "./thread.ts";

function message(
  id: string,
  replyTo: string | null,
  minute: number,
): z.infer<typeof relayMessageSchema> {
  return {
    id,
    replyTo,
    createdAt: `2026-10-14T10:${String(minute).padStart(2, "0")}:00Z`,
    fromAgentId: "a",
    to: { kind: "broadcast" },
    kind: "note",
    taskId: null,
    subject: id,
    body: "",
    readBy: [],
  };
}

describe("relayThread", () => {
  it("finds the root from a nested reply and orders all descendants by time", () => {
    const root = message("root", null, 0);
    const messages = [
      message("unrelated", null, 1),
      message("nested", "first", 3),
      message("second", "root", 2),
      root,
      message("first", "root", 1),
    ];
    const thread = relayThread(messages, "nested");
    expect(thread?.root).toEqual(root);
    expect(thread?.descendants.map(({ message, depth }) => [message.id, depth])).toEqual([
      ["first", 1],
      ["second", 1],
      ["nested", 2],
    ]);
  });
  it("keeps a single message without replies", () => {
    const root = message("root", null, 0);
    expect(relayThread([root], "root")).toEqual({ root, descendants: [] });
  });
  it("uses the visible message as root if its parent is absent", () => {
    const root = message("root", "absent", 0);
    expect(relayThread([root, message("child", "root", 1)], "child")?.root).toEqual(root);
  });
  it("returns null when the selected message is absent", () => {
    expect(relayThread([], "absent")).toBeNull();
  });
});
