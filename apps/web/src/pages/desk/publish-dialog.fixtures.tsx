import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Children, type ComponentProps, isValidElement, type ReactNode, useState } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, expect, vi } from "vitest";
import { Button } from "../../components/button.tsx";
import { Dialog } from "../../components/dialog.tsx";
import { Field } from "../../components/field.tsx";
import { request } from "../../lib/api.ts";
import { PublishDialog, type PublishSeed } from "./publish-dialog.tsx";

export const state = { lang: "en" as "en" | "zh", request: vi.mocked(request) };
afterEach(() => {
  vi.unstubAllGlobals();
  state.request.mockReset();
  vi.restoreAllMocks();
  state.lang = "en";
});
export const seed: PublishSeed = {
  title: "Original task",
  body: `# Full requirements\n\n\`\`\`ts\n${"original line\n".repeat(60)}\`\`\``,
  priority: "urgent",
  tags: ["two words", "one,tag", "plain"],
  capabilities: ["coding", "review"],
};
export function elements(node: ReactNode): React.ReactElement<{ children?: ReactNode }>[] {
  return Children.toArray(node).flatMap((child) =>
    isValidElement<{ children?: ReactNode }>(child)
      ? [child, ...elements(child.props.children)]
      : [],
  );
}
export function renderDraft(
  initial: PublishSeed | undefined,
  steps: ((tree: ReturnType<typeof PublishDialog>) => void)[] = [],
) {
  vi.stubGlobal("localStorage", { getItem: () => "current-person", setItem: vi.fn() });
  const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  client.setQueryData(["agents"], []);
  client.setQueryData(["people"], [{ id: "current-person", name: "Current", role: "member" }]);
  const invalidate = vi.spyOn(client, "invalidateQueries");
  const close = vi.fn();
  let result: ReturnType<typeof PublishDialog> | undefined;
  function Probe() {
    const [step, setStep] = useState(0);
    result = PublishDialog({ ...(initial ? { seed: initial } : {}), onClose: close });
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
export function edit(tree: ReturnType<typeof PublishDialog>, field: number, value: string) {
  const input = elements(tree.props.children).filter((element) => element.type === Field)[
    field
  ] as React.ReactElement<ComponentProps<typeof Field>>;
  input.props.onChange?.({ target: { value } } as React.ChangeEvent<HTMLInputElement> &
    React.ChangeEvent<HTMLTextAreaElement>);
}
export function submit(tree: ReturnType<typeof PublishDialog>) {
  const form = component(tree, "form");
  form.props.onSubmit?.({
    preventDefault: vi.fn(),
  } as unknown as React.SubmitEvent<HTMLFormElement>);
}
export function confirmation(tree: ReturnType<typeof PublishDialog>) {
  return elements(tree.props.children).find((element) => element.type === Dialog) as
    | React.ReactElement<ComponentProps<typeof Dialog>>
    | undefined;
}
export function cancel(tree: ReturnType<typeof PublishDialog>) {
  return elements(tree.props.footer).find(
    (element) => element.type === Button,
  ) as React.ReactElement<{ onClick: () => void; disabled: boolean }>;
}
export function confirmButtons(tree: ReturnType<typeof PublishDialog>) {
  return elements(confirmation(tree)?.props.footer).filter(
    (element) => element.type === Button,
  ) as React.ReactElement<{ onClick: () => void }>[];
}
export function component<C extends React.ElementType>(
  tree: ReturnType<typeof PublishDialog>,
  type: C,
) {
  return elements(tree.props.children).find(
    (element) => element.type === type,
  ) as React.ReactElement<ComponentProps<C>>;
}
export async function payload() {
  await vi.waitFor(() => expect(state.request).toHaveBeenCalledOnce());
  expect(state.request.mock.calls[0]?.[0]).toBe("/tasks");
  const options = state.request.mock.calls[0]?.[1];
  if (!options) throw new Error("Publish request missing");
  expect(options.method).toBe("POST");
  return JSON.parse(options.body as string);
}
