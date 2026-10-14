import type { TaskStatus } from "@idesk/core";
import { STATUS_META } from "../lib/format.ts";

export function StatusDot({ status, size = 14 }: { status: TaskStatus; size?: number }) {
  const m = STATUS_META[status];
  if (m.dot === "check") {
    return (
      <svg width={size} height={size} viewBox="0 0 16 16" aria-hidden>
        <circle cx="8" cy="8" r="7" fill="none" stroke={m.color} strokeWidth="1.6" />
        <path d="M4.8 8.3l2.1 2.1 4.3-4.6" fill="none" stroke={m.color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }
  if (m.dot === "fill") {
    return (
      <svg width={size} height={size} viewBox="0 0 16 16" aria-hidden>
        <circle cx="8" cy="8" r="7" fill="none" stroke={m.color} strokeWidth="1.6" />
        <path d="M8 1.6a6.4 6.4 0 0 1 0 12.8z" fill={m.color} />
      </svg>
    );
  }
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" aria-hidden>
      <circle cx="8" cy="8" r="7" fill="none" stroke={m.color} strokeWidth="1.6" strokeDasharray={status === "open" ? "2.5 2.5" : undefined} />
    </svg>
  );
}
