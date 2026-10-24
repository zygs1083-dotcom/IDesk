import type { TaskEvent } from "../../lib/types.ts";
import { prLinks } from "./pr-links.ts";

export function TaskPrBadges({ result, events }: { result: string | null; events: TaskEvent[] }) {
  const links = prLinks(result, events);
  if (links.length === 0) return null;
  return (
    <span data-ui="pr-badges" className="flex min-w-0 flex-wrap gap-2 text-label">
      {links.map(({ href, number, repository }) => (
        <a
          key={href}
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          title={`${repository} · PR #${number}`}
          aria-label={`${repository} · PR #${number}`}
          className="relative z-10 inline-flex max-w-full break-all rounded-sm border border-line px-1.5 py-0.5 text-text-2 transition-colors duration-hover hover:bg-surface-2 hover:text-text focus-visible:outline-2 focus-visible:outline-accent"
        >
          PR #{number}
        </a>
      ))}
    </span>
  );
}
