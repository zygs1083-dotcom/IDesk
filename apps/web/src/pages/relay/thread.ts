import type { relayMessageSchema } from "@idesk/shared/relay-schemas";
import type { z } from "zod";

type Message = z.infer<typeof relayMessageSchema>;

export function relayThread(
  messages: Message[],
  selectedId: string,
): { root: Message; descendants: { message: Message; depth: number }[] } | null {
  const byId = new Map(messages.map((message) => [message.id, message]));
  let root = byId.get(selectedId);
  if (!root) return null;
  while (root.replyTo && byId.has(root.replyTo)) {
    root = byId.get(root.replyTo) as Message;
  }
  const depths = new Map<string, number | null>([[root.id, 0]]);
  function depthOf(message: Message): number | null {
    const path: Message[] = [];
    let current: Message | undefined = message;
    while (current && !depths.has(current.id)) {
      path.push(current);
      current = current.replyTo ? byId.get(current.replyTo) : undefined;
    }
    let depth = current ? (depths.get(current.id) as number | null) : null;
    for (const entry of path.reverse()) {
      depth = depth === null ? null : depth + 1;
      depths.set(entry.id, depth);
    }
    return depth;
  }
  const descendants: { message: Message; depth: number }[] = [];
  for (const message of messages) {
    const depth = depthOf(message);
    if (depth !== null && depth > 0) descendants.push({ message, depth });
  }
  descendants.sort(
    (a, b) =>
      a.message.createdAt.localeCompare(b.message.createdAt) ||
      a.message.id.localeCompare(b.message.id),
  );
  return { root, descendants };
}
