import { renderToStaticMarkup } from "react-dom/server";
import { expect, test, vi } from "vitest";
import { AccessPage } from "./access-page.tsx";

vi.mock("../../i18n/lang.tsx", async () => {
  const { translator } = await import("../../i18n/translate.ts");
  return { useLang: () => ({ lang: "zh", t: translator("zh") }) };
});
vi.mock("./webhook-receiver.tsx", () => ({ WebhookReceiver: () => null }));

test("agent guide is the first access row and opens in a new tab", () => {
  vi.stubGlobal("location", { origin: "https://desk.example" });
  const html = renderToStaticMarkup(<AccessPage />);
  expect(html.indexOf("智能体接入规范")).toBeLessThan(html.indexOf("REST 基址"));
  expect(html).toContain("https://desk.example/agent-guide.md");
  expect(html).toMatch(
    /<a href="https:\/\/desk\.example\/agent-guide\.md" target="_blank" rel="noreferrer"[^>]*>打开<\/a>/,
  );
});
