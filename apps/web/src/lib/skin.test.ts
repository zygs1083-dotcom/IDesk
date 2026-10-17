import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import { afterEach, describe, expect, it, vi } from "vitest";
import { applySkin } from "./skin.ts";

const html = readFileSync(new URL("../../index.html", import.meta.url), "utf8");
const bootstrap = html.match(/<script>([\s\S]*?)<\/script>/)?.[1];
if (!bootstrap) throw new Error("Missing skin bootstrap");

function boot(storage: Pick<Storage, "getItem" | "setItem">) {
  const document = { documentElement: { dataset: { skin: "" } } };
  runInNewContext(bootstrap as string, { document, localStorage: storage });
  return document;
}

function storageWith(value: string | null) {
  const values = new Map(value === null ? [] : [["idesk.skin", value]]);
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
  };
}

afterEach(() => vi.unstubAllGlobals());

describe("browser skin preference", () => {
  it.each([
    [null, "classic"],
    ["classic", "classic"],
    ["cartoon", "cartoon"],
    ["unknown", "classic"],
  ])("initializes %s as %s before the app loads", (saved, expected) => {
    expect(boot(storageWith(saved)).documentElement.dataset.skin).toBe(expected);
    expect(html.indexOf("<script>")).toBeLessThan(html.indexOf('<script type="module"'));
  });

  it("applies either skin immediately and restores it on the next page load", () => {
    const storage = storageWith(null);
    const document = boot(storage);
    vi.stubGlobal("document", document);
    vi.stubGlobal("localStorage", storage);
    for (const skin of ["cartoon", "classic"] as const) {
      applySkin(skin);
      expect(document.documentElement.dataset.skin).toBe(skin);
      expect(storage.getItem("idesk.skin")).toBe(skin);
      expect(boot(storage).documentElement.dataset.skin).toBe(skin);
    }
  });

  it("keeps switching on the current page when storage reads and writes fail", () => {
    const storage = {
      getItem: () => {
        throw new Error("Storage blocked");
      },
      setItem: () => {
        throw new Error("Storage blocked");
      },
    };
    const document = boot(storage);
    expect(document.documentElement.dataset.skin).toBe("classic");
    vi.stubGlobal("document", document);
    vi.stubGlobal("localStorage", storage);
    applySkin("cartoon");
    expect(document.documentElement.dataset.skin).toBe("cartoon");
    applySkin("classic");
    expect(document.documentElement.dataset.skin).toBe("classic");
  });
});
