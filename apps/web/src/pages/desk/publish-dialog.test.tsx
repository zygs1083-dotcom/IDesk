import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Children, type ComponentProps, isValidElement, type ReactNode, useState } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, expect, test, vi } from "vitest";
import { Field } from "../../components/field.tsx";
import { DispatchFields } from "./dispatch-fields.tsx";
import { PublishDialog, type PublishSeed } from "./publish-dialog.tsx";
import type { PublishTemplates } from "./publish-templates.tsx";

const state = vi.hoisted(() => ({
  lang: "en" as "en" | "zh",
  request: vi.fn(),
}));
vi.mock("../../lib/api.ts", () => ({ request: state.request }));
vi.mock("../../i18n/lang.tsx", async () => {
  const { translator } = await import("../../i18n/translate.ts");
  return { useLang: () => ({ lang: state.lang, t: translator(state.lang) }) };
});
afterEach(() => {
  vi.unstubAllGlobals();
  state.request.mockReset();
  vi.restoreAllMocks();
  state.lang = "en";
});
const seed: PublishSeed = {
  title: "Original task",
  body: `# Full requirements\n\n\`\`\`ts\n${"original line\n".repeat(60)}\`\`\``,
  priority: "urgent",
  tags: ["two words", "one,tag", "plain"],
  capabilities: ["coding", "review"],
};
function elements(node: ReactNode): React.ReactElement<{ children?: ReactNode }>[] {
  return Children.toArray(node).flatMap((child) =>
    isValidElement<{ children?: ReactNode }>(child)
      ? [child, ...elements(child.props.children)]
      : [],
  );
}
function renderDraft(
  initial: PublishSeed | undefined,
  steps: ((tree: ReturnType<typeof PublishDialog>) => void)[] = [],
) {
  vi.stubGlobal("localStorage", { getItem: () => "current-person" });
  const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  client.setQueryData(["agents"], []);
  client.setQueryData(["people"], [{ id: "current-person", name: "Current", role: "member" }]);
  const invalidate = vi.spyOn(client, "invalidateQueries");
  const close = vi.fn();
  const currentSeed = initial;
  let result: ReturnType<typeof PublishDialog> | undefined;
  function Probe() {
    const [step, setStep] = useState(0);
    result = PublishDialog({ ...(currentSeed ? { seed: currentSeed } : {}), onClose: close });
    if (step < steps.length) {
      steps[step]?.(result);
      setStep(step + 1);
    }
    return result;
  }
  renderToStaticMarkup(
    <QueryClientProvider client={client}>
      <Probe />
    </QueryClientProvider>,
  );
  if (!result) throw new Error("Publish dialog did not render");
  return { tree: result, close, client, invalidate };
}
function edit(tree: ReturnType<typeof PublishDialog>, field: number, value: string) {
  const input = elements(tree.props.children).filter((element) => element.type === Field)[
    field
  ] as React.ReactElement<ComponentProps<typeof Field>>;
  const onChange = input.props.onChange;
  onChange?.({ target: { value } } as React.ChangeEvent<HTMLInputElement> &
    React.ChangeEvent<HTMLTextAreaElement>);
}
function submit(tree: ReturnType<typeof PublishDialog>) {
  const form = tree.props.children;
  form.props.onSubmit({ preventDefault: vi.fn() });
}
async function payload() {
  await vi.waitFor(() => expect(state.request).toHaveBeenCalledOnce());
  expect(state.request.mock.calls[0]?.[0]).toBe("/tasks");
  const options = state.request.mock.calls[0]?.[1];
  expect(options.method).toBe("POST");
  return JSON.parse(options.body);
}

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
  ]);
  const fields = elements(view.tree.props.children).filter(
    (element) => element.type === Field,
  ) as React.ReactElement<ComponentProps<typeof Field>>[];
  expect(fields[0]?.props.value).toBe("My draft");
  expect(fields[1]?.props.value).toBe(seed.body);
  const cancel = Children.toArray(view.tree.props.footer)[0] as React.ReactElement<{
    children: React.ReactElement<{ onClick: () => void }>[];
  }>;
  cancel.props.children[0]?.props.onClick();
  view.tree.props.onClose();
  expect(view.close).toHaveBeenCalledTimes(2);
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
