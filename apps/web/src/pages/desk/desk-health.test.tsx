import type { Dispatch, ReactElement, ReactNode, SetStateAction } from "react";
import { afterEach, assert, beforeEach, expect, test, vi } from "vitest";
import type { Task, TaskEvent } from "../../lib/types.ts";
import { Board } from "./board.tsx";
import { BoardHealth } from "./board-health.tsx";
import { boardHealth } from "./board-health-state.ts";
import { Desk } from "./desk.tsx";
import { detailTask } from "./task-detail.fixtures.ts";

const state = vi.hoisted(() => ({
  values: [] as unknown[],
  cursor: 0,
  tasks: [] as Task[],
  searchResults: [] as Task[],
  events: new Map<string, TaskEvent[]>(),
  pending: [] as import("./board-health-state.ts").PendingRequest[],
  status: {
    silent: "success",
    waiting: "success",
  } as import("./board-health-state.ts").HealthQueryStatus,
  error: null as Error | null,
}));
vi.mock("react", async (original) => ({
  ...(await original<typeof import("react")>()),
  useState: <T,>(initial: T | (() => T)): [T, Dispatch<SetStateAction<T>>] => {
    const index = state.cursor++;
    if (!(index in state.values))
      state.values[index] = typeof initial === "function" ? (initial as () => T)() : initial;
    return [
      state.values[index] as T,
      (value) => {
        state.values[index] =
          typeof value === "function"
            ? (value as (previous: T) => T)(state.values[index] as T)
            : value;
      },
    ];
  },
  useEffect: () => {},
  useRef: () => ({ current: null }),
}));
vi.mock("react-router", () => ({
  Link: "a",
  useSearchParams: () => [new URLSearchParams(), vi.fn()],
}));
vi.mock("@tanstack/react-query", () => ({
  keepPreviousData: vi.fn(),
  useQuery: ({ queryKey }: { queryKey: string[] }) => ({
    data: queryKey[0] === "tasks" ? state.searchResults : [],
    isPending: false,
    error: null,
  }),
}));
vi.mock("../../lib/use-tasks.ts", () => ({
  useTasks: () => ({ tasks: state.tasks, error: null, isPending: false }),
}));
vi.mock("../../lib/use-session.ts", () => ({ useSession: () => ({ isAdmin: false }) }));
vi.mock("../../lib/use-shortcut.ts", () => ({ useShortcut: () => {} }));
vi.mock("../../i18n/lang.tsx", () => ({ useLang: () => ({ t: (key: string) => key }) }));
vi.mock("./use-board-health.ts", async () => {
  const { boardHealth } = await import("./board-health-state.ts");
  return {
    useBoardHealth: (scope: Task[], tasks: Task[]) => ({
      health: boardHealth(scope, tasks, state.events, state.pending, Date.now()),
      status: state.status,
      error: state.error,
    }),
  };
});
vi.mock("./board.tsx", () => ({ Board: () => null }));
vi.mock("./task-drawer.tsx", () => ({ TaskDrawer: () => null }));
vi.mock("./publish-dialog.tsx", () => ({ PublishDialog: () => null }));

type Tree = ReactElement<{ children: ReactNode }>;
function find<P>(node: ReactNode, type: ReactElement["type"]): ReactElement<P> | undefined {
  const element = node as Tree;
  if (element.type === type) return element as ReactElement<P>;
  for (const child of [element.props?.children].flat()) {
    if (child && typeof child === "object" && "type" in child) {
      const match = find<P>(child, type);
      if (match) return match;
    }
  }
  return undefined;
}
function render() {
  state.cursor = 0;
  const tree = Desk();
  const board = find<Parameters<typeof Board>[0]>(tree, Board);
  const health = find<Parameters<typeof BoardHealth>[0]>(tree, BoardHealth);
  assert(board);
  assert(health);
  return { board: board.props, health: health.props, alert: find<{ children: string }>(tree, "p") };
}
afterEach(() => vi.unstubAllGlobals());
beforeEach(() => {
  vi.stubGlobal("localStorage", { getItem: () => null });
  state.values = [];
  state.tasks = [
    { ...detailTask, id: "running", status: "in_progress" },
    { ...detailTask, id: "blocked", status: "open", blockedBy: ["running"] },
  ];
  state.searchResults = [];
  state.events = new Map();
  state.pending = [];
  state.status = { silent: "success", waiting: "success" };
  state.error = null;
});

test("Desk combines health with search and both grouping modes without changing pre-filter counts", () => {
  let page = render();
  expect(page.board.visible).toEqual(state.tasks);
  page.health.onChange("blocked");
  page = render();
  expect(page.board.visible.map((task) => task.id)).toEqual(["blocked"]);
  expect(page.health.health.in_progress.size).toBe(1);
  state.values[0] = "host";
  page = render();
  expect(page.board.group).toBe("host");
  expect(page.board.visible.map((task) => task.id)).toEqual(["blocked"]);
  state.values[2] = "blocked search";
  state.searchResults = [state.tasks[1] as Task];
  page = render();
  expect(page.health.health.blocked.size).toBe(1);
  expect(page.health.health.in_progress.size).toBe(0);
  expect(page.board.tasks).toEqual(state.tasks);
  page.health.onChange("silent");
  page = render();
  expect(page.board.visible).toEqual([]);
  expect(page.board.filtered).toBe(true);
  page.health.onChange(null);
  page = render();
  expect(page.board.visible).toEqual(state.searchResults);
  expect(page.board.filtered).toBe(true);
  state.values[2] = "";
  expect(render().board.filtered).toBe(false);
});

test("Desk immediately applies a task update to the active filter", () => {
  render().health.onChange("blocked");
  expect(render().board.visible).toHaveLength(1);
  state.tasks = state.tasks.map((task) =>
    task.id === "running" ? { ...task, status: "done" } : task,
  );
  expect(render().board.visible).toEqual([]);
  expect(render().health.health).toEqual(
    boardHealth(state.tasks, state.tasks, new Map(), [], Date.now()),
  );
});

test.each(["silent", "waiting"] as const)(
  "Desk suppresses a false empty result while %s is pending or failed",
  (filter) => {
    state.status[filter] = "pending";
    render().health.onChange(filter);
    expect(render().board.loading).toBe(true);
    state.status[filter] = "error";
    state.error = new Error("Could not load health data");
    expect(render().board.loading).toBe(true);
    expect(render().alert?.props.children).toBe(state.error.message);
    state.status[filter] = "success";
    state.error = null;
    expect(render().board.loading).toBe(false);
  },
);

test("Desk health counts only displayable tasks while preserving pending replies on completed tasks", () => {
  state.tasks = [
    { ...detailTask, id: "cancelled", status: "cancelled" },
    { ...detailTask, id: "done", status: "done" },
  ];
  state.pending = state.tasks.map((task) => ({
    kind: "request",
    fromAgentId: "deleted-agent",
    taskId: task.id,
  }));
  render().health.onChange("waiting");
  const page = render();
  expect(page.health.health.waiting.size).toBe(1);
  expect(page.board.visible.map((task) => task.id)).toEqual(["done"]);
});
