import { Children, isValidElement, type ReactElement, type ReactNode } from "react";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { Button } from "../../components/button.tsx";
import { Dialog } from "../../components/dialog.tsx";
import type { Agent } from "../../lib/types.ts";
import { AgentDetails } from "./agent-details.tsx";
import { AgentsPage } from "./agents-page.tsx";

const state = vi.hoisted(() => ({ values: [] as unknown[], cursor: 0 }));

vi.mock("react", async (importOriginal) => ({
  ...(await importOriginal<typeof import("react")>()),
  useState: (initial: unknown) => {
    const index = state.cursor++;
    if (!(index in state.values)) state.values[index] = initial;
    return [state.values[index], (value: unknown) => (state.values[index] = value)];
  },
}));
vi.mock("react-router", () => ({
  useSearchParams: () => [new URLSearchParams()],
  useLocation: () => ({ hash: "" }),
  useNavigate: () => vi.fn(),
}));
vi.mock("../../i18n/lang.tsx", async () => {
  const { translator } = await import("../../i18n/translate.ts");
  return { useLang: () => ({ lang: "zh", t: translator("zh") }) };
});
vi.mock("../../lib/use-agents.ts", () => ({
  useAgents: () => ({ agents: [agent], error: null, isPending: false }),
}));
vi.mock("../../lib/use-session.ts", () => ({ useSession: () => ({ isAdmin: true }) }));
vi.mock("../../lib/use-shortcut.ts", () => ({ useShortcut: vi.fn() }));

const agent: Agent = {
  id: "agent",
  name: "Agent",
  kind: "codex",
  host: "host",
  capabilities: [],
  webhookUrl: "••••••",
  client: "idesk-receiver/0.2.0 (darwin; wake=codex)",
  lastSeenAt: null,
  createdAt: "2026-10-18T00:00:00Z",
  status: "online",
};
type Element = ReactElement<{
  children?: ReactNode;
  onClick?: (event: { stopPropagation: () => void }) => void;
  onClose?: () => void;
  "aria-expanded"?: boolean;
  "data-ui"?: string;
}>;

function elements(node: ReactNode): Element[] {
  return Children.toArray(node).flatMap((child) =>
    isValidElement<Element["props"]>(child) ? [child, ...elements(child.props.children)] : [],
  );
}
function render() {
  state.cursor = 0;
  return elements(AgentsPage());
}
function click(tree: Element[], target: "name" | "row" | "menu") {
  const element = tree.find((element) =>
    target === "name"
      ? element.type === Button && element.props["aria-expanded"] !== undefined
      : element.type === (target === "row" ? "tr" : "td") && element.props.onClick,
  );
  const stopPropagation = vi.fn();
  element?.props.onClick?.({ stopPropagation });
  if (target !== "row") expect(stopPropagation).toHaveBeenCalledOnce();
}

beforeEach(() => {
  state.values = [];
  state.cursor = 0;
  vi.stubGlobal("document", { documentElement: { dataset: { skin: "classic" } } });
  vi.stubGlobal("window", { matchMedia: vi.fn(() => ({ matches: true })) });
});
afterEach(() => vi.unstubAllGlobals());

for (const skin of ["classic", "cartoon", "pixel"]) {
  for (const narrow of [true, false]) {
    test.each(["name", "row"] as const)(
      `${skin} ${narrow ? "390px" : "1440px"} %s click opens the expected details`,
      (target) => {
        document.documentElement.dataset.skin = skin;
        vi.mocked(window.matchMedia).mockReturnValue({ matches: narrow } as MediaQueryList);
        click(render(), target);
        const tree = render();
        const dialog = narrow || skin === "pixel";
        expect(tree.some((element) => element.type === Dialog)).toBe(dialog);
        expect(tree.some((element) => element.props["data-ui"] === "agent-expanded-row")).toBe(
          !dialog,
        );
        expect(tree.filter((element) => element.type === AgentDetails)).toHaveLength(1);
        if (!dialog) {
          click(tree, target);
          expect(render().some((element) => element.type === AgentDetails)).toBe(false);
        }
      },
    );
    test(`${skin} ${narrow ? "390px" : "1440px"} menu click does not open details`, () => {
      document.documentElement.dataset.skin = skin;
      vi.mocked(window.matchMedia).mockReturnValue({ matches: narrow } as MediaQueryList);
      click(render(), "menu");
      expect(render().some((element) => element.type === AgentDetails)).toBe(false);
    });
  }
  test(`${skin} closing removes dialog details before reopening`, () => {
    document.documentElement.dataset.skin = skin;
    click(render(), "name");
    render()
      .find((element) => element.type === Dialog)
      ?.props.onClose?.();
    expect(render().some((element) => element.type === AgentDetails)).toBe(false);
    click(render(), "row");
    expect(render().filter((element) => element.type === AgentDetails)).toHaveLength(1);
  });
}

test("details use the viewport at click time and replace an expanded row with a dialog", () => {
  vi.mocked(window.matchMedia).mockReturnValue({ matches: false } as MediaQueryList);
  click(render(), "row");
  const tree = render();
  vi.mocked(window.matchMedia).mockReturnValue({ matches: true } as MediaQueryList);
  click(tree, "name");
  const narrow = render();
  expect(window.matchMedia).toHaveBeenCalledWith("(width < 48rem)");
  expect(narrow.some((element) => element.type === Dialog)).toBe(true);
  expect(narrow.some((element) => element.props["data-ui"] === "agent-expanded-row")).toBe(false);
  expect(narrow.filter((element) => element.type === AgentDetails)).toHaveLength(1);
});
