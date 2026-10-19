import type { ReactElement } from "react";
import { beforeEach, expect, test, vi } from "vitest";
import { agentOnboardingMessage, CreateAgent } from "./create-agent.tsx";
import { RotateAgentKey } from "./rotate-agent-key.tsx";

const state = vi.hoisted(() => ({
  values: [] as unknown[],
  cursor: 0,
  createData: null as object | null,
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
  return { useLang: () => ({ lang: "en", t: translator("en") }) };
});

type Action = ReactElement<{ children: string; onClick: () => Promise<void> }>;
type DialogTree = ReactElement<{ footer: ReactElement<{ children: [Action, Action, Action] }> }>;

function actions(dialog: DialogTree): [Action, Action, Action] {
  return dialog.props.footer.props.children;
}

beforeEach(() => {
  state.values = [];
  state.cursor = 0;
  state.createData = {
    agent: { name: "Agent" },
    apiKey: "secret",
  };
  vi.stubGlobal("location", { origin: "https://desk.example" });
  vi.stubGlobal("navigator", { clipboard: { writeText: vi.fn().mockResolvedValue(undefined) } });
});

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

test("failed message copy shows the message-specific error", async () => {
  vi.mocked(navigator.clipboard.writeText).mockRejectedValue(new Error("Clipboard denied"));
  const buttons = actions(CreateAgent({ onClose: vi.fn() }) as DialogTree);
  await buttons[2].props.onClick();
  expect(state.values[6]).toBe("Could not copy. Select and copy the setup message.");
});

test.each(["key", "message"] as const)(
  "rotated key %s copy changes only its own button",
  async (kind) => {
    state.values[0] = "new-key";
    const agent = {
      id: "agent",
      name: "Agent",
      kind: "codex" as const,
      host: "host",
      capabilities: [],
      webhookUrl: null,
      client: null,
      lastSeenAt: null,
      createdAt: "2026-10-18T00:00:00Z",
      status: "online" as const,
    };
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
