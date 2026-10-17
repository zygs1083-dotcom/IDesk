import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, test, vi } from "vitest";
import { AgentsPage } from "../pages/agents/agents-page.tsx";
import { PluginsPage } from "../pages/settings/plugins-page.tsx";
import { useSession } from "./use-session.ts";

vi.mock("../i18n/lang.tsx", async () => {
  const { translator } = await import("../i18n/translate.ts");
  return { useLang: () => ({ lang: "en", t: translator("en") }), currentLang: () => "en" };
});

test.each([undefined, "viewer", "admin"] as const)(
  "session %s gates write controls while keeping details readable",
  (role) => {
    const client = new QueryClient();
    if (role) client.setQueryData(["auth", "me"], { role });
    client.setQueryData(
      ["agents"],
      [
        {
          id: "agent",
          name: "Visible agent",
          kind: "codex",
          host: "test",
          capabilities: [],
          status: "offline",
          lastSeenAt: null,
          webhookUrl: null,
        },
      ],
    );
    client.setQueryData(
      ["plugins"],
      [
        {
          id: "plugin",
          name: "Visible plugin",
          kind: "action",
          version: "1",
          enabled: true,
          configSchema: {},
          error: null,
        },
      ],
    );
    let allowed: boolean | undefined;
    function Probe() {
      allowed = useSession().isAdmin;
      return null;
    }
    const html = renderToStaticMarkup(
      <QueryClientProvider client={client}>
        <Probe />
        <AgentsPage />
        <PluginsPage />
      </QueryClientProvider>,
    );
    expect(allowed).toBe(role === "admin");
    expect(html).toContain("Visible agent");
    expect(html).toContain("Visible plugin");
    const controls = html.match(/<(?:button|input)[^>]*>/g) ?? [];
    const writes = controls.filter(
      (tag) => tag.includes('aria-haspopup="menu"') || tag.includes('role="switch"'),
    );
    expect(writes.length).toBeGreaterThan(0);
    for (const tag of writes) expect(tag.includes('disabled=""')).toBe(role !== "admin");
    client.clear();
  },
);
