import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, test, vi } from "vitest";
import type { Agent } from "../../lib/types.ts";
import { CreateAgent } from "./create-agent.tsx";

vi.mock("../../i18n/lang.tsx", async () => {
  const { translator } = await import("../../i18n/translate.ts");
  return { useLang: () => ({ lang: "en", t: translator("en") }), currentLang: () => "en" };
});

test.each(["gemini", "opencode", "droid", "cursor"] as const)(
  "%s can be selected at registration but kind stays read-only when editing",
  (kind) => {
    const client = new QueryClient();
    client.setQueryData(["agents"], []);
    const render = (agent?: Agent) =>
      renderToStaticMarkup(
        <QueryClientProvider client={client}>
          <CreateAgent {...(agent ? { agent } : {})} onClose={() => {}} />
        </QueryClientProvider>,
      );
    expect(render()).toContain(`value="${kind}"`);
    const editing = render({
      id: "01",
      kind,
      name: "Agent",
      host: "host",
      capabilities: [],
      webhookUrl: null,
      client: null,
      lastSeenAt: null,
      createdAt: "2026-10-18T00:00:00Z",
      status: "online",
    });
    expect(editing).not.toContain("<select");
    expect(editing).toContain('readOnly=""');
    client.clear();
  },
);
