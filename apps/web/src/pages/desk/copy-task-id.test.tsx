import type { ComponentProps } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, expect, test, vi } from "vitest";
import { CopyTaskId } from "./copy-task-id.tsx";

const controls = vi.hoisted(() => ({ clicks: [] as (() => Promise<void>)[] }));
vi.mock("../../i18n/lang.tsx", async () => {
  const { translator } = await import("../../i18n/translate.ts");
  return { useLang: () => ({ lang: "en", t: translator("en") }) };
});
vi.mock("../../components/button.tsx", async (original) => {
  const { Button } = await original<typeof import("../../components/button.tsx")>();
  return {
    Button: (props: ComponentProps<typeof Button>) => {
      if (props.onClick) controls.clicks.push(props.onClick as () => Promise<void>);
      return <Button {...props} />;
    },
  };
});

beforeEach(() => {
  controls.clicks.length = 0;
  vi.unstubAllGlobals();
});

test("each rendered task copies its complete original ID without URL or formatting", async () => {
  const writeText = vi.fn().mockResolvedValue(undefined);
  vi.stubGlobal("navigator", { clipboard: { writeText } });
  const ids = ["  task/中文?x=1&y=2#fragment\n ", "task-second"];
  for (const taskId of ids) {
    renderToStaticMarkup(<CopyTaskId taskId={taskId} onError={vi.fn()} />);
    await controls.clicks.at(-1)?.();
  }
  expect(writeText.mock.calls).toEqual(ids.map((id) => [id]));
});

test("copy failure uses the existing error callback and allows retrying the same ID", async () => {
  const writeText = vi
    .fn()
    .mockRejectedValueOnce(new Error("Clipboard denied"))
    .mockResolvedValue(undefined);
  vi.stubGlobal("navigator", { clipboard: { writeText } });
  const onError = vi.fn();
  renderToStaticMarkup(<CopyTaskId taskId="task-retry" onError={onError} />);
  await controls.clicks[0]?.();
  expect(onError).toHaveBeenCalledTimes(1);
  await controls.clicks[0]?.();
  expect(writeText.mock.calls).toEqual([["task-retry"], ["task-retry"]]);
  expect(onError).toHaveBeenCalledTimes(1);
});
