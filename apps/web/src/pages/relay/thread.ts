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
  const depths = new Map([[root.id, 0]]);
  function depthOf(message: Message): number | null {
    const known = depths.get(message.id);
    if (known !== undefined) return known;
    const parent = message.replyTo ? byId.get(message.replyTo) : undefined;
    if (!parent) return null;
    const parentDepth = depthOf(parent);
    if (parentDepth === null) return null;
    depths.set(message.id, parentDepth + 1);
    return parentDepth + 1;
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
