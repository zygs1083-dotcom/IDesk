import { renderToReadableStream } from "react-dom/server";
import { expect, test, vi } from "vitest";
import type { TaskEvent } from "../../lib/types.ts";
import { TaskTimeline } from "./task-timeline.tsx";

vi.mock("../../i18n/lang.tsx", async () => {
  const { translator } = await import("../../i18n/translate.ts");
  return { useLang: () => ({ lang: "en", t: translator("en") }) };
});

test.each([
  [0, []],
  [1, [1]],
  [10, [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]],
  [11, [2, 3, 4, 5, 6, 7, 8, 9, 10, 11]],
  [40, [31, 32, 33, 34, 35, 36, 37, 38, 39, 40]],
] as const)("%i events open at the latest records in API order", async (count, expected) => {
  const events = Array.from(
    { length: count },
    (_, index): TaskEvent => ({
      id: `event-${String(index + 1).padStart(2, "0")}`,
      taskId: "task-timeline",
      agentId: `actor-${index + 1}`,
      ts: index % 3 === 0 ? "2026-10-19T12:09:00Z" : "2026-10-19T12:00:00Z",
      type: index % 2 === 0 ? "task.reported" : "task.pause",
      payload: index % 2 === 0 ? { message: `Report ${index + 1}` } : {},
    }),
  );
  const stream = await renderToReadableStream(
    <TaskTimeline events={events} agentName={(id) => id ?? ""} />,
    { progressiveChunkSize: Number.POSITIVE_INFINITY },
  );
  await stream.allReady;
  const html = await new Response(stream).text();
  const items = html.match(/<li\b[\s\S]*?<\/li>/g) ?? [];
  expect(items).toHaveLength(expected.length);
  for (const [index, number] of expected.entries()) {
    const event = events[number - 1] as TaskEvent;
    expect(items[index]).toContain(`actor-${number} `);
    expect(items[index]).toContain(`dateTime="${event.ts}"`);
    if (event.type === "task.reported") {
      expect(items[index]).toContain(`Report ${number}`);
      expect(items[index]).toContain('data-lines="2" data-expanded="false"');
    }
  }
  const controls = html.match(/<button\b[^>]*>/g) ?? [];
  expect(controls).toHaveLength(count > 10 ? 1 : 0);
  if (count > 10) {
    expect(controls[0]).toContain('aria-expanded="false"');
    const listId = html.match(/<ol id="([^"]+)"/)?.[1];
    expect(controls[0]).toContain(`aria-controls="${listId}"`);
  }
});
