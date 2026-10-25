import { TASK_STATUSES } from "@idesk/shared/task-status";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Children,
  type ComponentProps,
  isValidElement,
  type ReactElement,
  type ReactNode,
  useState,
} from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, test, vi } from "vitest";
import { Menu } from "../../components/menu.tsx";
import type { Task } from "../../lib/types.ts";
import { PublishDialog } from "./publish-dialog.tsx";
import { detailTask } from "./task-detail.fixtures.ts";
import { TaskDrawer } from "./task-drawer.tsx";

vi.mock("../../i18n/lang.tsx", async () => {
  const { translator } = await import("../../i18n/translate.ts");
  return { useLang: () => ({ lang: "en", t: translator("en") }) };
});
function elements(node: ReactNode): ReactElement<{ children?: ReactNode; footer?: ReactNode }>[] {
  return Children.toArray(node).flatMap((child) =>
    isValidElement<{ children?: ReactNode; footer?: ReactNode }>(child)
      ? [child, ...elements(child.props.children), ...elements(child.props.footer)]
      : [],
  );
}
function menu(tree: ReturnType<typeof TaskDrawer>) {
  return elements(tree).find((element) => element.type === Menu) as
    | ReactElement<ComponentProps<typeof Menu>>
    | undefined;
}
function draft(tree: ReturnType<typeof TaskDrawer>) {
  return elements(tree).find((element) => element.type === PublishDialog) as
    | ReactElement<ComponentProps<typeof PublishDialog>>
    | undefined;
}
function run(
  task: Task | undefined,
  role: "admin" | "viewer" | undefined,
  steps: ((
    tree: ReturnType<typeof TaskDrawer>,
    client: QueryClient,
    select: (id: string) => void,
  ) => void)[] = [],
) {
  const client = new QueryClient();
  if (role) client.setQueryData(["auth", "me"], { role });
  if (task) client.setQueryData(["task", task.id], task);
  client.setQueryData(["agents"], []);
  const closeSource = vi.fn();
  let tree: ReturnType<typeof TaskDrawer> | undefined;
  function Probe() {
    const [taskId, setTaskId] = useState(task?.id ?? "loading");
    const [step, setStep] = useState(0);
    tree = TaskDrawer({ taskId, onClose: closeSource });
    if (step < steps.length) {
      steps[step]?.(tree, client, setTaskId);
      setStep(step + 1);
    }
    return null;
  }
  renderToStaticMarkup(
    <QueryClientProvider client={client}>
      <Probe />
    </QueryClientProvider>,
  );
  client.clear();
  if (!tree) throw new Error("Task drawer did not render");
  return { tree, closeSource };
}

test.each(TASK_STATUSES)("%s tasks can open a draft from the last secondary action", (status) => {
  const view = run({ ...detailTask, status }, "admin", [
    (tree) => {
      expect(draft(tree)).toBeUndefined();
      menu(tree)?.props.items.at(-1)?.onSelect();
    },
  ]);
  expect(draft(view.tree)?.props.seed).toMatchObject({ title: detailTask.title });
});

test.each([undefined, "viewer"] as const)("%s cannot open a seeded publishing draft", (role) => {
  expect(menu(run(detailTask, role).tree)).toBeUndefined();
});
test("an admin cannot create before the task has loaded", () => {
  expect(menu(run(undefined, "admin").tree)).toBeUndefined();
});

test("click snapshots full requirements and refetch cannot overwrite the draft", () => {
  const source = { ...detailTask, tags: ["two words", "one,tag"], capabilities: ["coding"] };
  const view = run(source, "admin", [
    (tree) => menu(tree)?.props.items.at(-1)?.onSelect(),
    (_tree, client) => {
      client.setQueryData(["task", source.id], {
        ...source,
        title: "Refetched title",
        body: "Refetched body",
      });
      source.tags.push("later");
      source.capabilities.push("later");
    },
  ]);
  expect(draft(view.tree)?.props.seed).toEqual({
    title: detailTask.title,
    body: detailTask.body,
    priority: detailTask.priority,
    tags: ["two words", "one,tag"],
    capabilities: ["coding"],
  });
  expect(view.closeSource).not.toHaveBeenCalled();
});

test("closing a draft keeps source open and returns focus without scrolling", () => {
  const focus = vi.fn();
  const view = run(detailTask, "admin", [
    (tree) => {
      const trigger = menu(tree)?.props.triggerRef;
      if (trigger) trigger.current = { focus } as unknown as HTMLButtonElement;
      menu(tree)?.props.items.at(-1)?.onSelect();
    },
    (tree) => draft(tree)?.props.onClose(),
  ]);
  expect(draft(view.tree)).toBeUndefined();
  expect(focus).toHaveBeenCalledWith({ preventScroll: true });
  expect(view.closeSource).not.toHaveBeenCalled();
});

test("switching source and back discards its old draft", () => {
  const view = run(detailTask, "admin", [
    (tree) => menu(tree)?.props.items.at(-1)?.onSelect(),
    (_tree, client, select) => {
      client.setQueryData(["task", "other"], { ...detailTask, id: "other" });
      select("other");
    },
    (tree, _client, select) => {
      expect(draft(tree)).toBeUndefined();
      select(detailTask.id);
    },
  ]);
  expect(draft(view.tree)).toBeUndefined();
});
