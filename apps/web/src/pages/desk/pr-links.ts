import type { TaskEvent } from "../../lib/types.ts";

export function prLinks(result: string | null, events: TaskEvent[]) {
  const messages = [result ?? ""];
  for (const event of events) {
    if (event.type === "task.reported" && typeof event.payload.message === "string") {
      messages.push(event.payload.message);
    }
  }
  const links = new Map<string, { href: string; number: string; repository: string }>();
  for (const message of messages) {
    const candidates = message.matchAll(
      /(?<![\w/:\\.-])https:\/\/[^\s<>()[\]{}"'`「」『』，。！？、；：]+/gi,
    );
    for (const [candidate] of candidates) {
      if (!/^https:\/\/github\.com\//i.test(candidate) || candidate.includes("\\")) continue;
      const path = new URL(candidate.replace(/[.,;:!?]+$/, "")).pathname;
      const match = path.match(
        /^\/([a-z\d](?:[a-z\d-]*[a-z\d])?)\/([a-z\d_.-]+)\/pull\/([1-9]\d*)(?=$|\/)/i,
      );
      if (!match) continue;
      const owner = match[1] as string;
      const repo = match[2] as string;
      const number = match[3] as string;
      const href = `https://github.com/${owner}/${repo}/pull/${number}`;
      const key = href.toLowerCase();
      if (!links.has(key)) links.set(key, { href, number, repository: `${owner}/${repo}` });
    }
  }
  return [...links.values()];
}
