import type { Lang } from "@idesk/shared/labels";
import type { ChangeEvent, ReactElement, ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, expect, test, vi } from "vitest";
import { BoardHealth } from "./board-health.tsx";
import { boardHealth, type HealthFilter, type HealthTasks } from "./board-health-state.ts";
import { detailTask } from "./task-detail.fixtures.ts";

const state = vi.hoisted(() => ({ lang: "en" as Lang }));
vi.mock("../../i18n/lang.tsx", async () => {
  const { translator } = await import("../../i18n/translate.ts");
  return { useLang: () => ({ lang: state.lang, t: translator(state.lang) }) };
});
type Button = ReactElement<{
  type: string;
  "aria-pressed": boolean;
  children: ReactNode;
  onClick: () => void;
}>;
const tasks = [
  { ...detailTask, id: "running", status: "in_progress" as const },
  { ...detailTask, id: "blocked", status: "open" as const, blockedBy: ["running"] },
];
const health = boardHealth(tasks, tasks, new Map(), [], Date.now());
function buttons(
  health: HealthTasks,
  value: HealthFilter | null,
  onChange: (value: HealthFilter | null) => void,
) {
  const tree = BoardHealth({
    health,
    status: { silent: "success", waiting: "success" },
    value,
    onChange,
  });
  const children = tree.props.children[2].props.children;
  return [children[0], ...children[1]] as Button[];
}
beforeEach(() => {
  state.lang = "en";
});

test("health controls replace the active filter and clear on a second click or All", () => {
  let selected: HealthFilter | null = null;
  const controls = () =>
    buttons(health, selected, (value) => {
      selected = value;
    });
  expect(controls().map((button) => button.props["aria-pressed"])).toEqual([
    true,
    false,
    false,
    false,
    false,
    false,
  ]);
  controls()[1]?.props.onClick();
  expect(selected).toBe("in_progress");
  expect(controls().map((button) => button.props["aria-pressed"])).toEqual([
    false,
    true,
    false,
    false,
    false,
    false,
  ]);
  controls()[3]?.props.onClick();
  expect(selected).toBe("blocked");
  controls()[3]?.props.onClick();
  expect(selected).toBe(null);
  controls()[4]?.props.onClick();
  expect(selected).toBe("waiting");
  controls()[5]?.props.onClick();
  expect(selected).toBe("overdue");
  controls()[5]?.props.onClick();
  expect(selected).toBe(null);
  controls()[5]?.props.onClick();
  controls()[0]?.props.onClick();
  expect(selected).toBe(null);
  expect(
    controls().every((button) => button.type === "button" && button.props.type === "button"),
  ).toBe(true);
});

test("counts are calculated before a health filter and stay scoped to the search intersection", () => {
  const searchResults = tasks.filter((task) => task.id === "blocked");
  const scoped = boardHealth(searchResults, tasks, new Map(), [], Date.now());
  expect(scoped.in_progress.size).toBe(0);
  expect(scoped.blocked.size).toBe(1);
  let selected: HealthFilter | null = null;
  const select = (value: HealthFilter | null) => {
    selected = value;
  };
  buttons(scoped, selected, select)[3]?.props.onClick();
  expect(searchResults.filter((task) => selected && scoped[selected].has(task.id))).toEqual(
    searchResults,
  );
  buttons(scoped, selected, select)[1]?.props.onClick();
  expect(searchResults.filter((task) => selected && scoped[selected].has(task.id))).toEqual([]);
  expect(scoped.blocked.size).toBe(1);
  expect(scoped.in_progress.size).toBe(0);
});

test("the narrow-screen native select switches health filters and All clears them", () => {
  const onChange = vi.fn();
  const tree = BoardHealth({
    health,
    status: { silent: "success", waiting: "success" },
    value: "overdue",
    onChange,
  });
  const select = tree.props.children[1];
  expect(select.type).toBe("select");
  expect(select.props.value).toBe("overdue");
  expect(select.props["aria-label"]).toBeTruthy();
  const change = select.props.onChange as (event: ChangeEvent<HTMLSelectElement>) => void;
  change({ target: { value: "waiting" } } as ChangeEvent<HTMLSelectElement>);
  expect(onChange).toHaveBeenLastCalledWith("waiting");
  change({ target: { value: "" } } as ChangeEvent<HTMLSelectElement>);
  expect(onChange).toHaveBeenLastCalledWith(null);
});

test.each(["zh", "en"] as const)(
  "%s exposes labeled native controls with real zero counts",
  (lang) => {
    state.lang = lang;
    const empty = boardHealth([], [], new Map(), [], Date.now());
    const html = renderToStaticMarkup(
      <BoardHealth
        health={empty}
        status={{ silent: "success", waiting: "success" }}
        value="silent"
        onChange={() => {}}
      />,
    );
    expect(html.match(/<button\b/g)).toHaveLength(6);
    expect(html.match(/<select\b/g)).toHaveLength(1);
    expect(html.match(/<option\b/g)).toHaveLength(6);
    expect(html.match(/selected=""/g)).toHaveLength(1);
    expect(html.match(/aria-pressed="true"/g)).toHaveLength(1);
    expect(html.match(/class="tabular-nums">0<\/span>/g)).toHaveLength(5);
    expect(html).toContain('<legend class="sr-only">');
  },
);

test("pending or failed health queries display an indeterminate count instead of zero", () => {
  const html = renderToStaticMarkup(
    <BoardHealth
      health={health}
      status={{ silent: "pending", waiting: "error" }}
      value="silent"
      onChange={() => {}}
    />,
  );
  expect(html.match(/aria-busy="true"/g)).toHaveLength(1);
  expect(html).toContain('class="tabular-nums">…</span>');
  expect(html).toContain('class="tabular-nums">—</span>');
  expect(html).toMatch(/<option value="silent"[^>]*>[^<]*…<\/option>/);
  expect(html).toMatch(/<option value="waiting"[^>]*>[^<]*—<\/option>/);
});
