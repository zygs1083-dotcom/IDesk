import type { Lang } from "@idesk/shared/labels";
import type { ReactElement, ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import type { Agent } from "../../lib/types.ts";
import { agentOnboardingMessage, CreateAgent } from "./create-agent.tsx";
import { RotateAgentKey } from "./rotate-agent-key.tsx";

const state = vi.hoisted(() => ({
  values: [] as unknown[],
  cursor: 0,
  createData: null as object | null,
  lang: "en" as Lang,
}));

vi.mock("react", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react")>();
  return {
    ...actual,
    useState: (initial: unknown) => {
      const index = state.cursor++;
      if (!(index in state.values)) state.values[index] = initial;
      return [state.values[index], (value: unknown) => (state.values[index] = value)];
    },
  };
});
vi.mock("@tanstack/react-query", () => ({
  useQueryClient: () => ({ invalidateQueries: vi.fn() }),
  useMutation: () => ({ data: state.createData, isPending: false }),
}));
vi.mock("../../lib/use-agents.ts", () => ({ useAgents: () => ({ agents: [] }) }));
vi.mock("../../i18n/lang.tsx", async () => {
  const { translator } = await import("../../i18n/translate.ts");
  return { useLang: () => ({ lang: state.lang, t: translator(state.lang) }) };
});

type Action = ReactElement<{ children: string; onClick: () => Promise<void> }>;
type DialogTree = ReactElement<{
  children: ReactNode;
  footer: ReactElement<{ children: [Action, Action, Action] }>;
}>;

const agent: Agent = {
  id: "agent",
  name: "Agent",
  kind: "codex",
  host: "host",
  capabilities: [],
  webhookUrl: null,
  client: null,
  lastSeenAt: null,
  createdAt: "2026-10-18T00:00:00Z",
  status: "online",
};

function actions(dialog: DialogTree): [Action, Action, Action] {
  return dialog.props.footer.props.children;
}

beforeEach(() => {
  state.values = [];
  state.cursor = 0;
  state.lang = "en";
  state.createData = {
    agent: { name: "Agent" },
    apiKey: "secret",
  };
  vi.stubGlobal("location", { origin: "https://desk.example" });
  vi.stubGlobal("navigator", { clipboard: { writeText: vi.fn().mockResolvedValue(undefined) } });
});
afterEach(() => vi.unstubAllGlobals());

test.each(["key", "message"] as const)(
  "new agent %s copy changes only its own button",
  async (kind) => {
    const render = () => {
      state.cursor = 0;
      return actions(CreateAgent({ onClose: vi.fn() }) as DialogTree);
    };
    const initial = render();
    await initial[kind === "key" ? 0 : 2].props.onClick();
    const buttons = render();
    expect(buttons.map((button) => button.props.children)).toEqual(
      kind === "key" ? ["Copied", "Complete", "Copy message"] : ["Copy", "Complete", "Copied"],
    );
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
      kind === "key"
        ? "secret"
        : agentOnboardingMessage("en", "https://desk.example", "Agent", "secret", false),
    );
  },
);

test.each(["key", "message"] as const)(
  "rotated key %s copy changes only its own button",
  async (kind) => {
    state.values[0] = "new-key";
    const render = () => {
      state.cursor = 0;
      return actions(RotateAgentKey({ agent, onClose: vi.fn() }) as DialogTree);
    };
    const initial = render();
    await initial[kind === "key" ? 0 : 2].props.onClick();
    const buttons = render();
    expect(buttons.map((button) => button.props.children)).toEqual(
      kind === "key" ? ["Copied", "Complete", "Copy message"] : ["Copy", "Complete", "Copied"],
    );
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
      kind === "key"
        ? "new-key"
        : agentOnboardingMessage("en", "https://desk.example", "Agent", "new-key", true),
    );
  },
);

test.each([
  ["new", "en"],
  ["new", "zh"],
  ["rotated", "en"],
  ["rotated", "zh"],
] as const)(
  "failed %s message copy in %s exposes the full message for manual selection",
  async (kind, lang) => {
    state.lang = lang;
    if (kind === "rotated") state.values[0] = "new-key";
    const render = () => {
      state.cursor = 0;
      return (
        kind === "new"
          ? CreateAgent({ onClose: vi.fn() })
          : RotateAgentKey({ agent, onClose: vi.fn() })
      ) as DialogTree;
    };
    const initial = render();
    expect(renderToStaticMarkup(initial.props.children)).not.toContain("<textarea");
    vi.mocked(navigator.clipboard.writeText).mockRejectedValue(new Error("Clipboard denied"));
    await actions(initial)[0].props.onClick();
    expect(renderToStaticMarkup(render().props.children)).not.toContain("<textarea");
    await actions(render())[2].props.onClick();
    const failed = render();
    const html = renderToStaticMarkup(failed.props.children);
    const message = agentOnboardingMessage(
      lang,
      "https://desk.example",
      "Agent",
      kind === "new" ? "secret" : "new-key",
      kind === "rotated",
    );
    const textarea = html.match(/<textarea([^>]*)>([\s\S]*?)<\/textarea>/);
    expect(textarea?.[1]).toContain('readOnly=""');
    expect(textarea?.[1]).not.toContain("disabled");
    expect(textarea?.[2]).toBe(
      renderToStaticMarkup(<textarea defaultValue={message} />).replace(/<\/?textarea>/g, ""),
    );
    expect(html).toContain(
      lang === "en"
        ? "Could not copy. Select the setup message below and copy it."
        : "复制失败，请手动选中下面的接入消息复制",
    );
    expect(actions(failed)[0].props.children).toBe(lang === "en" ? "Copy" : "复制");
    expect(actions(failed)[2].props.children).toBe(lang === "en" ? "Copy message" : "复制接入消息");
    vi.mocked(navigator.clipboard.writeText).mockResolvedValue(undefined);
    await actions(failed)[0].props.onClick();
    const recovered = render();
    expect(renderToStaticMarkup(recovered.props.children)).not.toContain("<textarea");
    expect(actions(recovered)[0].props.children).toBe(lang === "en" ? "Copied" : "已复制");
    expect(actions(recovered)[2].props.children).toBe(
      lang === "en" ? "Copy message" : "复制接入消息",
    );
  },
);
