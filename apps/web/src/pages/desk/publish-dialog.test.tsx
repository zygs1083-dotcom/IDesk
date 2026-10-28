import type { ComponentProps } from "react";
import { expect, test, vi } from "vitest";
import { Field } from "../../components/field.tsx";
import { DispatchFields } from "./dispatch-fields.tsx";
import {
  cancel,
  confirmation,
  confirmButtons,
  edit,
  elements,
  payload,
  renderDraft,
  seed,
  state,
  submit,
} from "./publish-dialog.fixtures.tsx";
import type { PublishTemplates } from "./publish-templates.tsx";

vi.mock("../../lib/api.ts", () => ({ request: vi.fn() }));
vi.mock("../../i18n/lang.tsx", async () => {
  const { translator } = await import("../../i18n/translate.ts");
  return { useLang: () => ({ lang: state.lang, t: translator(state.lang) }) };
});

test("seed submits only reusable fields, preserves special tag boundaries and current publisher", async () => {
  state.request.mockResolvedValue({ id: "new-task" });
  const view = renderDraft(seed, [submit]);
  expect(await payload()).toEqual({ ...seed, publisherPersonId: "current-person" });
  await vi.waitFor(() => expect(view.close).toHaveBeenCalledOnce());
  expect(view.invalidate).toHaveBeenCalledWith({ queryKey: ["tasks"] });
  view.client.clear();
});

test("tag edits update the draft without changing its complete body", () => {
  const view = renderDraft(seed, [(tree) => edit(tree, 2, "edited words,comma，中文")]);
  const fields = elements(view.tree.props.children).filter(
    (element) => element.type === Field,
  ) as React.ReactElement<ComponentProps<typeof Field>>[];
  expect(fields[1]?.props.value).toBe(seed.body);
  expect(fields[2]?.props.value).toBe("edited words,comma，中文");
  expect(state.request).not.toHaveBeenCalled();
  view.client.clear();
});

test("selecting a template replaces seeded requirements and tags before publishing", () => {
  const view = renderDraft(seed, [
    (tree) => {
      const templates = tree.props.actions as React.ReactElement<
        ComponentProps<typeof PublishTemplates>
      >;
      templates.props.onSelect({ title: "Template", tags: ["template words,tag"] });
    },
  ]);
  const fields = elements(view.tree.props.children).filter(
    (element) => element.type === Field,
  ) as React.ReactElement<ComponentProps<typeof Field>>[];
  expect(fields.map((field) => field.props.value)).toEqual([
    "Template",
    "",
    "template words,tag",
    "",
  ]);
  expect(state.request).not.toHaveBeenCalled();
  view.client.clear();
});

test("language changes preserve edits and cancel or dialog dismissal never submits", () => {
  const view = renderDraft(seed, [
    (tree) => {
      edit(tree, 0, "My draft");
      state.lang = "zh";
    },
    (tree) => cancel(tree).props.onClick(),
    (tree) => {
      expect(confirmation(tree)).toBeDefined();
      confirmation(tree)?.props.onClose();
      tree.props.onClose();
    },
    (tree) => {
      expect(confirmation(tree)).toBeUndefined();
      tree.props.onClose();
    },
    (tree) => {
      expect(confirmation(tree)).toBeDefined();
      confirmButtons(tree)[0]?.props.onClick();
    },
  ]);
  const fields = elements(view.tree.props.children).filter(
    (element) => element.type === Field,
  ) as React.ReactElement<ComponentProps<typeof Field>>[];
  expect(fields[0]?.props.value).toBe("My draft");
  expect(fields[1]?.props.value).toBe(seed.body);
  expect(confirmation(view.tree)).toBeUndefined();
  expect(view.close).not.toHaveBeenCalled();
  expect(state.request).not.toHaveBeenCalled();
  view.client.clear();
});

test("ordinary blank publishing keeps defaults and manual dispatch selection", () => {
  const view = renderDraft(undefined, [
    (tree) => {
      const fields = elements(tree.props.children).filter(
        (element) => element.type === Field,
      ) as React.ReactElement<ComponentProps<typeof Field>>[];
      expect(fields.map((field) => field.props.value)).toEqual(["", "", "", ""]);
      edit(tree, 0, "Blank creation");
      const dispatch = elements(tree.props.children).find(
        (element) => element.type === DispatchFields,
      ) as React.ReactElement<ComponentProps<typeof DispatchFields>>;
      expect(dispatch.props).toMatchObject({ mode: "open", agentId: "", needed: 2 });
      dispatch.props.onModeChange("recruit");
    },
  ]);
  const dispatch = elements(view.tree.props.children).find(
    (element) => element.type === DispatchFields,
  ) as React.ReactElement<ComponentProps<typeof DispatchFields>>;
  expect(dispatch.props).toMatchObject({ mode: "recruit", needed: 2 });
  expect(state.request).not.toHaveBeenCalled();
  view.client.clear();
});
