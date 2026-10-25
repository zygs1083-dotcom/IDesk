import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Children, type ComponentProps, type ReactElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, expect, test, vi } from "vitest";
import type { Button } from "../../components/button.tsx";
import type { Task } from "../../lib/types.ts";
import { EditTaskDialog } from "./edit-task-dialog.tsx";

const state = vi.hoisted(() => ({ request: vi.fn() }));
vi.mock("../../lib/api.ts", () => ({ request: state.request }));
vi.mock("../../i18n/lang.tsx", async () => {
  const { translator } = await import("../../i18n/translate.ts");
  return { useLang: () => ({ lang: "en", t: translator("en") }) };
});
const clients: QueryClient[] = [];
afterEach(() => {
  for (const client of clients.splice(0)) client.clear();
  state.request.mockReset();
  vi.restoreAllMocks();
});
const task: Task = {
  id: "task",
  title: "  Task title  ",
  body: "# Full requirements\n\nKeep this body.",
  status: "in_progress",
  priority: "urgent",
  tags: ["two words", "one,tag", "中文，标签", "plain"],
  capabilities: ["coding", "review"],
  blockedBy: [],
  publisherId: "human",
  assigneeId: "agent",
  recruit: null,
  leaseExpiresAt: null,
  result: null,
  dueAt: "2030-01-01T12:34:56.123Z",
  createdAt: "2026-01-01T00:00:00Z",
  updatedAt: "2026-01-01T00:00:00Z",
  completedAt: null,
};
function renderEdit(initial: Task, role: "admin" | "viewer" | undefined) {
  const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  clients.push(client);
  if (role) client.setQueryData(["auth", "me"], { role });
  client.setQueryData(["agents"], []);
  const invalidate = vi.spyOn(client, "invalidateQueries");
  const close = vi.fn();
  let tree: ReturnType<typeof EditTaskDialog> | undefined;
  function Probe() {
    tree = EditTaskDialog({ task: initial, onClose: close });
    return tree;
  }
  renderToStaticMarkup(
    <QueryClientProvider client={client}>
      <Probe />
    </QueryClientProvider>,
  );
  if (!tree) throw new Error("Edit dialog did not render");
  const buttons = Children.toArray(tree.props.footer.props.children) as ReactElement<
    ComponentProps<typeof Button>
  >[];
  return { tree, buttons, close, invalidate, client };
}

test.each([
  { tags: task.tags, dueAt: task.dueAt },
  { tags: [], dueAt: null },
])("untouched tags $tags are omitted from the edit PATCH", async ({ tags, dueAt }) => {
  state.request.mockResolvedValue(task);
  const view = renderEdit({ ...task, tags, dueAt }, "admin");
  expect(view.buttons[1]?.props.disabled).toBe(false);
  const preventDefault = vi.fn();
  view.tree.props.children.props.onSubmit({ preventDefault });
  expect(preventDefault).toHaveBeenCalledOnce();
  await vi.waitFor(() => expect(state.request).toHaveBeenCalledOnce());
  const [path, options] = state.request.mock.calls[0] ?? [];
  expect(path).toBe("/tasks/task");
  expect(options.method).toBe("PATCH");
  expect(JSON.parse(options.body)).toEqual({
    title: "Task title",
    body: task.body,
    priority: task.priority,
    capabilities: task.capabilities,
    dueAt,
  });
  await vi.waitFor(() => expect(view.close).toHaveBeenCalledOnce());
  expect(view.invalidate).toHaveBeenCalledWith({ queryKey: ["tasks"] });
  expect(view.invalidate).toHaveBeenCalledWith({ queryKey: ["task", task.id] });
});

test.each([undefined, "viewer"] as const)("%s cannot submit task edits", (role) => {
  const view = renderEdit(task, role);
  expect(view.buttons[1]?.props.disabled).toBe(true);
  const preventDefault = vi.fn();
  view.tree.props.children.props.onSubmit({ preventDefault });
  expect(preventDefault).toHaveBeenCalledOnce();
  expect(view.client.getMutationCache().getAll()).toHaveLength(0);
  expect(state.request).not.toHaveBeenCalled();
  expect(view.close).not.toHaveBeenCalled();
  expect(view.invalidate).not.toHaveBeenCalled();
});

test("cancel and dialog dismissal close without submitting", () => {
  const view = renderEdit(task, "admin");
  view.buttons[0]?.props.onClick?.({} as React.MouseEvent<HTMLButtonElement>);
  view.tree.props.onClose();
  expect(view.close).toHaveBeenCalledTimes(2);
  expect(state.request).not.toHaveBeenCalled();
  expect(view.invalidate).not.toHaveBeenCalled();
});
