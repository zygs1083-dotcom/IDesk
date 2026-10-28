import type { ComponentProps } from "react";
import { expect, test, vi } from "vitest";
import { CapabilityPicker } from "../../components/capability-picker.tsx";
import { DispatchFields } from "./dispatch-fields.tsx";
import {
  cancel,
  component,
  confirmation,
  confirmButtons,
  edit,
  payload,
  renderDraft,
  seed,
  state,
  submit,
} from "./publish-dialog.fixtures.tsx";
import type { PublishDialog } from "./publish-dialog.tsx";
import { PublishPriority } from "./publish-priority.tsx";
import type { PublishTemplates } from "./publish-templates.tsx";
import { PublisherSelect } from "./publisher-select.tsx";

vi.mock("../../lib/api.ts", () => ({ request: vi.fn() }));
vi.mock("../../i18n/lang.tsx", async () => {
  const { translator } = await import("../../i18n/translate.ts");
  return { useLang: () => ({ lang: state.lang, t: translator(state.lang) }) };
});

test("blank form closes directly and publisher preference alone does not protect it", () => {
  const view = renderDraft(undefined, [
    (tree) => component(tree, PublisherSelect).props.publisher.select("human"),
    (tree) => {
      tree.props.onClose();
      cancel(tree).props.onClick();
    },
  ]);
  expect(view.close).toHaveBeenCalledTimes(2);
  expect(confirmation(view.tree)).toBeUndefined();
  expect(localStorage.setItem).toHaveBeenCalledWith("publish.person", "human");
  expect(state.request).not.toHaveBeenCalled();
  view.client.clear();
});

const dirtyFields: [string, (tree: ReturnType<typeof PublishDialog>, reset: boolean) => void][] = [
  ["raw title", (tree, reset) => edit(tree, 0, reset ? "" : " ")],
  ["raw body", (tree, reset) => edit(tree, 1, reset ? "" : "\n")],
  ["raw tags", (tree, reset) => edit(tree, 2, reset ? "" : " , ")],
  [
    "capabilities",
    (tree, reset) => component(tree, CapabilityPicker).props.onChange(reset ? [] : ["coding"]),
  ],
  ["dueAt", (tree, reset) => edit(tree, 3, reset ? "" : "2026-10-28T12:00")],
  [
    "priority",
    (tree, reset) => component(tree, PublishPriority).props.onChange(reset ? "normal" : "urgent"),
  ],
  [
    "mode",
    (tree, reset) => component(tree, DispatchFields).props.onModeChange(reset ? "open" : "assign"),
  ],
  [
    "agent",
    (tree, reset) => component(tree, DispatchFields).props.onAgentChange(reset ? "" : "agent-1"),
  ],
  ["needed", (tree, reset) => component(tree, DispatchFields).props.onNeededChange(reset ? 2 : 3)],
];
test.each(dirtyFields)(
  "%s protects raw content and restoring default allows direct close",
  (_name, change) => {
    const view = renderDraft(undefined, [
      (tree) => change(tree, false),
      (tree) => tree.props.onClose(),
      (tree) => {
        expect(confirmation(tree)).toBeDefined();
        confirmButtons(tree)[0]?.props.onClick();
        change(tree, true);
      },
      (tree) => tree.props.onClose(),
    ]);
    expect(confirmation(view.tree)).toBeUndefined();
    expect(view.close).toHaveBeenCalledOnce();
    expect(state.request).not.toHaveBeenCalled();
    view.client.clear();
  },
);

test("seed is protected immediately and explicit discard closes without posting", () => {
  const view = renderDraft(seed, [
    (tree) => tree.props.onClose(),
    (tree) => confirmButtons(tree)[1]?.props.onClick(),
  ]);
  expect(view.close).toHaveBeenCalledOnce();
  expect(state.request).not.toHaveBeenCalled();
  view.client.clear();
});

test("template is protected and continue editing preserves special seeded tags for POST", async () => {
  state.request.mockResolvedValue({ id: "new-task" });
  const templateView = renderDraft(undefined, [
    (tree) =>
      (
        tree.props.actions as React.ReactElement<ComponentProps<typeof PublishTemplates>>
      ).props.onSelect({ title: "Template" }),
    (tree) => tree.props.onClose(),
  ]);
  expect(confirmation(templateView.tree)).toBeDefined();
  expect(templateView.close).not.toHaveBeenCalled();
  templateView.client.clear();
  const view = renderDraft(seed, [
    (tree) => tree.props.onClose(),
    (tree) => confirmButtons(tree)[0]?.props.onClick(),
    submit,
  ]);
  expect(await payload()).toMatchObject({ tags: seed.tags, body: seed.body });
  await vi.waitFor(() => expect(view.close).toHaveBeenCalledOnce());
  view.client.clear();
});

test("pending publishing prevents dismissal and success closes without confirmation", async () => {
  let finish: (value: object) => void = () => {};
  state.request.mockImplementation(
    () =>
      new Promise((resolve) => {
        finish = resolve;
      }),
  );
  const view = renderDraft(seed, [
    submit,
    (tree) => {
      expect(cancel(tree).props.disabled).toBe(true);
      cancel(tree).props.onClick();
      tree.props.onClose();
    },
  ]);
  expect(confirmation(view.tree)).toBeUndefined();
  expect(view.close).not.toHaveBeenCalled();
  expect(await payload()).toMatchObject({ tags: seed.tags });
  finish({ id: "new-task" });
  await vi.waitFor(() => expect(view.close).toHaveBeenCalledOnce());
  expect(state.request).toHaveBeenCalledOnce();
  view.client.clear();
});

test("failed publishing retains mutation error and does not close the draft", async () => {
  const error = new Error("Publish failed");
  state.request.mockRejectedValue(error);
  const view = renderDraft(seed, [submit]);
  await payload();
  await vi.waitFor(() =>
    expect(view.client.getMutationCache().getAll()[0]?.state.status).toBe("error"),
  );
  expect(view.client.getMutationCache().getAll()[0]?.state.error).toBe(error);
  expect(view.close).not.toHaveBeenCalled();
  expect(state.request).toHaveBeenCalledOnce();
  view.client.clear();
});
