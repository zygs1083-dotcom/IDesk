import {
  Children,
  type ComponentProps,
  type KeyboardEvent,
  type MouseEvent,
  type PointerEvent,
  type ReactElement,
} from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, test, vi } from "vitest";
import { TaskCard } from "./task-card.tsx";
import { detailTask } from "./task-detail.fixtures.ts";
import { TaskPrBadges } from "./task-pr-badges.tsx";

vi.mock("@tanstack/react-query", () => ({ useQuery: () => ({ data: [] }) }));
vi.mock("motion/react", () => ({ motion: { div: "div" }, useReducedMotion: () => true }));
vi.mock("../../i18n/lang.tsx", async () => {
  const { translator } = await import("../../i18n/translate.ts");
  return { useLang: () => ({ lang: "en", t: translator("en") }) };
});

const task = {
  ...detailTask,
  status: "open" as const,
  result: "https://github.com/team/repo/pull/42",
};
function card(isDragging = false) {
  const onOpen = vi.fn();
  const pointer = vi.fn();
  const keyboard = vi.fn();
  const drag = {
    attributes: {
      role: "button",
      tabIndex: 0,
      "aria-disabled": false,
      "aria-pressed": false,
      "aria-roledescription": "draggable",
      "aria-describedby": "drag-instructions",
    },
    listeners: { onPointerDown: pointer, onKeyDown: keyboard },
    setNodeRef: vi.fn(),
    setActivatorNodeRef: vi.fn(),
    isDragging,
  };
  const tree = TaskCard({ task, blockers: 0, name: "Agent", onOpen, drag }) as ReactElement<
    ComponentProps<"div">
  >;
  const button = Children.toArray(tree.props.children)[0] as ReactElement<ComponentProps<"button">>;
  return { tree, button, onOpen, pointer, keyboard, drag };
}

test("PR anchors are siblings of the task button with safe external destinations", () => {
  const { tree, button, onOpen, pointer, keyboard } = card();
  const badges = TaskPrBadges({ result: task.result, events: [] });
  const anchor = Children.toArray(badges?.props.children)[0] as ReactElement<ComponentProps<"a">>;
  expect(button.type).toBe("button");
  expect(anchor.props).toMatchObject({
    href: task.result,
    target: "_blank",
    rel: "noopener noreferrer",
    "aria-label": "team/repo · PR #42",
  });
  const html = renderToStaticMarkup(tree);
  expect(html.indexOf("</button>")).toBeLessThan(html.indexOf("<a "));
  for (const element of [anchor, tree]) {
    element.props.onClick?.({} as MouseEvent<HTMLAnchorElement> & MouseEvent<HTMLDivElement>);
    element.props.onPointerDown?.(
      {} as PointerEvent<HTMLAnchorElement> & PointerEvent<HTMLDivElement>,
    );
    element.props.onKeyDown?.({ key: "Enter" } as KeyboardEvent<HTMLAnchorElement> &
      KeyboardEvent<HTMLDivElement>);
  }
  expect(onOpen).not.toHaveBeenCalled();
  expect(pointer).not.toHaveBeenCalled();
  expect(keyboard).not.toHaveBeenCalled();
});

test.each([0, 1, 12])("cards retain capabilities and priority with %i PR links", (count) => {
  const urls = Array.from(
    { length: count },
    (_, index) => `https://github.com/team/repo/pull/${index + 1}`,
  );
  const html = renderToStaticMarkup(
    <TaskCard
      task={{
        ...task,
        capabilities: ["coding", "review"],
        priority: "urgent",
        result: urls.join(" "),
      }}
      blockers={0}
      name="Agent"
      onOpen={() => {}}
    />,
  );
  expect(html).toContain("coding · review");
  expect(html).toContain("↑Urgent");
  expect(html).toContain("Agent");
  expect(html.match(/<a /g) ?? []).toHaveLength(count);
  for (const url of urls) expect(html).toContain(`href="${url}"`);
});

test("Enter during keyboard dragging is reserved for dropping without opening details", () => {
  const { button, onOpen, keyboard } = card(true);
  const enter = { key: "Enter", code: "Enter" } as KeyboardEvent<HTMLButtonElement>;
  button.props.onKeyDown?.(enter);
  expect(onOpen).not.toHaveBeenCalled();
  expect(keyboard).toHaveBeenCalledExactlyOnceWith(enter);
});

test("task clicks and Enter open details while pointer and Space retain drag activation", () => {
  const { tree, button, onOpen, pointer, keyboard, drag } = card();
  expect(tree.props.ref).toBe(drag.setNodeRef);
  expect(button.props.ref).toBe(drag.setActivatorNodeRef);
  button.props.onClick?.({} as MouseEvent<HTMLButtonElement>);
  const preventDefault = vi.fn();
  button.props.onKeyDown?.({
    key: "Enter",
    preventDefault: () => preventDefault(),
  } as KeyboardEvent<HTMLButtonElement>);
  expect(onOpen).toHaveBeenCalledTimes(2);
  expect(preventDefault).toHaveBeenCalledOnce();
  expect(keyboard).not.toHaveBeenCalled();
  const space = { key: " ", code: "Space" } as KeyboardEvent<HTMLButtonElement>;
  button.props.onKeyDown?.(space);
  button.props.onPointerDown?.({} as PointerEvent<HTMLButtonElement>);
  expect(keyboard).toHaveBeenCalledExactlyOnceWith(space);
  expect(pointer).toHaveBeenCalledOnce();
  expect(tree.props["data-ui" as keyof typeof tree.props]).toBe("card");
});
