import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, expect, test, vi } from "vitest";
import { Board } from "./board.tsx";
import { detailTask } from "./task-detail.fixtures.ts";

vi.mock("../../i18n/lang.tsx", async () => {
  const { translator } = await import("../../i18n/translate.ts");
  return { useLang: () => ({ lang: "en", t: translator("en") }), currentLang: () => "en" };
});
afterEach(() => vi.unstubAllGlobals());

test.each([false, true])(
  "filtered=%s distinguishes an empty board from a zero-result filter",
  (filtered) => {
    vi.stubGlobal("document", { documentElement: { dataset: { skin: "classic" } } });
    const client = new QueryClient();
    client.setQueryData(["agents"], []);
    client.setQueryData(["people"], []);
    const html = renderToStaticMarkup(
      <QueryClientProvider client={client}>
        <Board
          tasks={[detailTask]}
          visible={[]}
          handoffs={[]}
          filtered={filtered}
          group="flat"
          loading={false}
          onOpen={() => {}}
          onPublish={() => {}}
        />
      </QueryClientProvider>,
    );
    expect(html.includes('data-ui="empty-state-overlay"')).toBe(!filtered);
    expect(html.includes("No matching tasks")).toBe(filtered);
    client.clear();
  },
);
