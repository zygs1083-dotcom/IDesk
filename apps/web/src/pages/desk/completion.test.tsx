import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactElement, ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, test, vi } from "vitest";
import type { Task } from "../../lib/types.ts";
import { ActionDialog } from "./action-dialog.tsx";
import { useTaskAction } from "./use-task-action.ts";

const state = vi.hoisted(() => ({ children: null as ReactNode, request: vi.fn() }));
vi.mock("../../i18n/lang.tsx", async () => {
  const { translator } = await import("../../i18n/translate.ts");
  return { useLang: () => ({ lang: "en", t: translator("en") }) };
});
vi.mock("../../components/dialog.tsx", () => ({
  Dialog: ({ children }: { children: ReactNode }) => {
    state.children = children;
    return <div>{children}</div>;
  },
}));
vi.mock("../../lib/api.ts", () => ({ request: state.request }));

test("completion form permits empty result, cancels without submitting, and submits once", () => {
  const submit = vi.fn();
  const close = vi.fn();
  renderToStaticMarkup(
    <ActionDialog
      action="complete"
      agents={[]}
      pending={false}
      error={null}
      onSubmit={submit}
      onClose={close}
      onDismissError={() => {}}
    />,
  );
  const form = state.children as ReactElement<{
    onSubmit: (event: { preventDefault: () => void }) => void;
    children: ReactNode[];
  }>;
  const actions = form.props.children.at(-1) as ReactElement<{
    children: ReactElement<{ onClick: () => void }>[];
  }>;
  actions.props.children[0]?.props.onClick();
  expect(close).toHaveBeenCalledOnce();
  expect(submit).not.toHaveBeenCalled();
  form.props.onSubmit({ preventDefault: vi.fn() });
  expect(submit).toHaveBeenCalledExactlyOnceWith({ type: "complete", result: "" });
});

test("complete waits for server success before changing task caches", async () => {
  const task: Task = {
    id: "task",
    title: "task",
    body: "",
    status: "in_progress",
    priority: "normal",
    tags: [],
    capabilities: [],
    blockedBy: [],
    publisherId: "human",
    assigneeId: "agent",
    recruit: null,
    leaseExpiresAt: "2030-01-01T00:00:00Z",
    result: null,
    dueAt: null,
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-01T00:00:00Z",
    completedAt: null,
  };
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  client.setQueryData(["tasks"], [task]);
  client.setQueryData(["task", task.id], task);
  let resolve: (task: Task) => void = () => {};
  state.request.mockImplementation(
    () =>
      new Promise<Task>((done) => {
        resolve = done;
      }),
  );
  const success = vi.fn();
  const captured: { action?: ReturnType<typeof useTaskAction> } = {};
  function Probe() {
    captured.action = useTaskAction(success);
    return null;
  }
  renderToStaticMarkup(
    <QueryClientProvider client={client}>
      <Probe />
    </QueryClientProvider>,
  );
  if (!captured.action) throw new Error("Hook did not render");
  const pending = captured.action.mutation.mutateAsync({
    task,
    action: { type: "complete", result: "finished" },
  });
  await vi.waitFor(() => expect(state.request).toHaveBeenCalled());
  expect(client.getQueryData(["tasks"])).toEqual([task]);
  expect(client.getQueryData(["task", task.id])).toEqual(task);
  expect(success).not.toHaveBeenCalled();
  expect(state.request).toHaveBeenCalledWith("/tasks/task/actions/complete", {
    method: "POST",
    body: JSON.stringify({ type: "complete", result: "finished" }),
  });
  resolve({ ...task, status: "done", result: "finished" });
  await pending;
  expect(success).toHaveBeenCalledOnce();
  client.clear();
});
