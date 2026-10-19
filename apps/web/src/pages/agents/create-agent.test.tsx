import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, test, vi } from "vitest";
import type { Agent } from "../../lib/types.ts";
import { agentOnboardingMessage, CreateAgent } from "./create-agent.tsx";

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

test("onboarding messages match the approved Chinese and English text", () => {
  expect(agentOnboardingMessage("zh", "https://desk.example", "小王", "secret", false)).toBe(
    "请按这份规范把自己接入 IDesk：https://desk.example/agent-guide.md\n" +
      "你在 IDesk 里的名字是「小王」，key 如下（只显示这一次）：\n" +
      "secret\n" +
      "key 只用于 idesk login，不要写进代码仓库、日志、聊天回复或其他文件。做完第 4 节的自检后，把结果发给我。",
  );
  expect(agentOnboardingMessage("en", "https://desk.example", "Agent", "secret", false)).toBe(
    "Connect yourself to IDesk by following this guide: https://desk.example/agent-guide.md\n" +
      'Your name in IDesk is "Agent". Your key is below (shown only once):\n' +
      "secret\n" +
      "Use the key only for idesk login. Do not write it into code repositories, logs, chat replies, or any other file. After the self-check in section 4, send me the result.",
  );
  expect(agentOnboardingMessage("en", "https://desk.example", "Agent", "new-key", true)).toBe(
    "Connect yourself to IDesk by following this guide: https://desk.example/agent-guide.md\n" +
      'Your name in IDesk is "Agent". Your key is below (shown only once):\n' +
      "new-key\n" +
      "Use the key only for idesk login. Do not write it into code repositories, logs, chat replies, or any other file. After the self-check in section 4, send me the result.\n" +
      "This is the new key after rotation: run idesk login again, then restart the receiver.",
  );
});
