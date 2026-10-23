import type { Lang } from "@idesk/shared/labels";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import type { TaskEvent } from "../../lib/types.ts";
import { TaskCard } from "./task-card.tsx";
import { detailTask } from "./task-detail.fixtures.ts";

const state = vi.hoisted(() => ({
  now: undefined as number | undefined,
  events: undefined as TaskEvent[] | undefined,
  cleanup: undefined as (() => void) | undefined,
  lang: "zh" as Lang,
  query: vi.fn(),
}));
vi.mock("react", async (original) => ({
  ...(await original<typeof import("react")>()),
  useState: (initial: () => number) => {
    state.now ??= initial();
    return [state.now, (value: number) => (state.now = value)];
  },
  useEffect: (effect: () => () => void) => {
    state.cleanup ??= effect();
  },
}));
vi.mock("@tanstack/react-query", () => ({
  useQuery: (options: object) => {
    state.query(options);
    return { data: state.events };
  },
}));
vi.mock("motion/react", () => ({ motion: { button: "button" }, useReducedMotion: () => true }));
vi.mock("../../i18n/lang.tsx", async () => {
  const { translator } = await import("../../i18n/translate.ts");
  return {
    useLang: () => ({ lang: state.lang, t: translator(state.lang) }),
    currentLang: () => state.lang,
  };
});

const now = new Date("2026-10-24T12:00:00Z").getTime();
function entry(minutesAgo: number): TaskEvent {
  return {
    id: "claim",
    taskId: detailTask.id,
    agentId: "agent",
    ts: new Date(now - minutesAgo * 60_000).toISOString(),
    type: "task.claim",
    payload: { from: "open", to: "in_progress" },
  };
}
function render(status = "in_progress" as typeof detailTask.status) {
  return renderToStaticMarkup(
    <TaskCard task={{ ...detailTask, status }} name="Agent" blockers={0} onOpen={() => {}} />,
  );
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(now);
  state.now = undefined;
  state.events = [entry(8)];
  state.lang = "zh";
  state.query.mockClear();
});
afterEach(() => {
  state.cleanup?.();
  state.cleanup = undefined;
  vi.useRealTimers();
});

test("in-progress cards show elapsed time from their task events", () => {
  expect(render()).toContain("已进行 8 分");
  expect(state.query).toHaveBeenCalledWith(
    expect.objectContaining({ queryKey: ["task", detailTask.id, "events"] }),
  );
});

test("silent cards color the whole elapsed and silence line with the lease warning token", () => {
  state.events = [entry(20)];
  expect(render()).toMatch(
    /<span class="mb-2 block text-label tabular-nums text-status-paused">已进行 20 分 · 沉默 20 分钟<\/span>/,
  );
});

test.each(["open", "assigned", "recruiting", "paused", "done", "cancelled"] as const)(
  "%s cards have no clock and do not query events",
  (status) => {
    expect(render(status)).not.toContain("已进行");
    expect(state.query).not.toHaveBeenCalled();
  },
);

test("elapsed time refreshes only after sixty seconds", () => {
  expect(render()).toContain("已进行 8 分");
  vi.advanceTimersByTime(59_999);
  expect(render()).toContain("已进行 8 分");
  vi.advanceTimersByTime(1);
  expect(render()).toContain("已进行 9 分");
});

test("missing events or a missing start event leave the line absent", () => {
  state.events = undefined;
  expect(render()).not.toContain("已进行");
  state.events = [];
  expect(render()).not.toContain("已进行");
});

test("English cards show elapsed time and silence", () => {
  state.lang = "en";
  state.events = [entry(20)];
  expect(render()).toContain("Running 20 min · Silent 20 min");
});
