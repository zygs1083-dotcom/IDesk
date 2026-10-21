import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { LoadingPanel } from "./loading-panel.tsx";

const language = vi.hoisted(() => ({ current: "zh" as "zh" | "en" }));
vi.mock("../i18n/lang.tsx", () => ({ useLang: () => ({ lang: language.current }) }));

const state = { progress: 73, visible: true, fading: false, phrase: 0 };

describe("loading panel semantics", () => {
  it("exposes real progress and removes all loading markup when hidden", () => {
    const html = renderToStaticMarkup(<LoadingPanel state={state} />);
    expect(html).toContain('role="progressbar"');
    expect(html).toContain('aria-valuenow="73"');
    expect(html).toContain('class="loading-phrase" aria-hidden="true"');
    expect(html).not.toContain("aria-live");
    expect(html).not.toContain("<canvas");
    expect(renderToStaticMarkup(<LoadingPanel state={{ ...state, visible: false }} />)).toBe("");
  });

  it("switches the current phrase and accessible name with the active language", () => {
    language.current = "zh";
    const chinese = renderToStaticMarkup(<LoadingPanel state={state} />);
    language.current = "en";
    const english = renderToStaticMarkup(<LoadingPanel state={state} />);
    expect(chinese).toContain('aria-label="正在布置办公室"');
    expect(chinese).toContain("loading-fallback");
    expect(english).toContain('aria-label="Setting up the office"');
    expect(english).not.toEqual(chinese);
    expect(english).toContain('aria-valuenow="73"');
  });
});
