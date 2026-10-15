import { Text } from "pixi.js";
import { afterEach, expect, test, vi } from "vitest";
import { Plaque } from "../world/plaque.ts";
import type { Stage } from "../world/stage.ts";
import { Bubble } from "./bubble.ts";
import { setGlyphText } from "./glyphs.ts";

vi.mock("pixi.js", () => {
  class Container {
    children: Container[] = [];
    visible = false;
    destroyed = false;
    text = "";
    style = { fontSize: 12 };
    anchor = { set: vi.fn() };
    position = { set: vi.fn() };
    addChild(...children: Container[]) {
      this.children.push(...children);
    }
    on() {}
    get width() {
      return this.text.length * 12;
    }
    get height() {
      return 12;
    }
  }
  class Graphics extends Container {
    clear() {
      return this;
    }
    poly() {
      return this;
    }
    fill() {
      return this;
    }
    stroke() {
      return this;
    }
  }
  return {
    Container,
    Graphics,
    Text: Container,
    CanvasTextMetrics: { measureText: (text: string) => ({ width: text.length * 12, height: 12 }) },
  };
});

afterEach(() => vi.unstubAllGlobals());

function deferFonts() {
  let release = () => {};
  const load = vi.fn(
    () =>
      new Promise<void>((resolve) => {
        release = resolve;
      }),
  );
  vi.stubGlobal("document", { fonts: { load } });
  return { load, release: () => release() };
}

test("bubble applies dynamic glyphs only after the matching font load finishes", async () => {
  const fonts = deferFonts();
  const bubble = new Bubble();
  bubble.show("龘饕餮", Number.POSITIVE_INFINITY);
  const text = bubble.children[1] as Text;
  expect(text.text).toBe("");
  expect(bubble.visible).toBe(false);
  expect(fonts.load).toHaveBeenCalledWith('12px "Fusion Pixel"', "龘饕餮");
  fonts.release();
  await Promise.resolve();
  expect(text.text).toBe("龘饕餮");
  expect(bubble.visible).toBe(true);
});

test("a bubble hidden before its glyphs load stays hidden", async () => {
  const fonts = deferFonts();
  const bubble = new Bubble();
  bubble.show("龘饕餮", Number.POSITIVE_INFINITY);
  bubble.hide();
  fonts.release();
  await Promise.resolve();
  expect(bubble.visible).toBe(false);
});

test("plaque refits its full host name after the font is available", async () => {
  const fonts = deferFonts();
  const stage = {
    layout: { objects: [{ id: "sign", item: "plaque", x: 0, y: 0 }] },
    catalog: {
      items: {
        plaque: { parts: [{ dx: 0, dy: 0, sortY: 0 }], textArea: { x: 0, y: 0, w: 110, h: 28 } },
      },
    },
    world: { scale: { x: 1 } },
    objects: { addChild: vi.fn() },
    app: { renderer: { on: vi.fn() } },
  } as unknown as Stage;
  const plaque = new Plaque(stage, "sign");
  plaque.setText("龘主机");
  const text = plaque.children[0] as Text;
  expect(text.text).toBe("");
  fonts.release();
  await Promise.resolve();
  expect(text.text).toBe("龘主机");
  expect(plaque.visible).toBe(true);
});

test("late font loads cannot overwrite newer text or destroyed labels", async () => {
  const releases: (() => void)[] = [];
  vi.stubGlobal("document", {
    fonts: { load: () => new Promise<void>((resolve) => releases.push(resolve)) },
  });
  const text = new Text();
  const old = setGlyphText(text, "old");
  const current = setGlyphText(text, "current");
  releases[1]?.();
  await current;
  releases[0]?.();
  await old;
  expect(text.text).toBe("current");
  const gone = setGlyphText(text, "gone");
  text.destroyed = true;
  releases[2]?.();
  await gone;
  expect(text.text).toBe("current");
});
