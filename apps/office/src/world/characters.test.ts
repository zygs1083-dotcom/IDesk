import { Assets, Texture, TextureSource } from "pixi.js";
import { expect, test, vi } from "vitest";
import codex from "../../public/characters/codex-a.json";
import custom from "../../public/characters/custom-a.json";
import receptionist from "../../public/characters/receptionist.json";
import { officeUrl } from "../office-url.ts";
import {
  characterFrames,
  characterSheets,
  loadCharacters,
  loadOutfitIndex,
  receptionistImage,
} from "./characters.ts";

test("shares in-flight requests and loads only requested stamped atlases", async () => {
  const fetcher = vi.fn(async (url: string) => ({
    json: async () =>
      url.includes("index.json")
        ? { codex: ["a"], custom: ["a"] }
        : url.includes("codex-a")
          ? codex
          : custom,
  }));
  vi.stubGlobal("fetch", fetcher);
  let release!: () => void;
  const pending = new Promise<void>((resolve) => {
    release = resolve;
  });
  const images = vi.spyOn(Assets, "load").mockImplementation((async () => {
    await pending;
    return new Texture({ source: new TextureSource({ width: 1600, height: 96 }) });
  }) as typeof Assets.load);
  expect(await loadOutfitIndex()).toEqual(await loadOutfitIndex());
  const first = loadCharacters(["codex-a", "codex-a"]);
  const second = loadCharacters(["codex-a"]);
  expect(characterSheets.has("codex-a")).toBe(false);
  release();
  await Promise.all([first, second]);
  expect(images).toHaveBeenCalledTimes(1);
  expect(characterFrames["codex-a/walk/down/0"]).toBe(
    characterSheets.get("codex-a")?.textures["codex-a/walk/down/0"],
  );
  expect(characterSheets.has("custom-a")).toBe(false);
  await loadCharacters(["custom-a"]);
  expect(images).toHaveBeenCalledTimes(2);
  expect(fetcher.mock.calls.map(([url]) => url)).toEqual([
    officeUrl("characters/index.json"),
    officeUrl("characters/codex-a.json"),
    officeUrl("characters/custom-a.json"),
  ]);
  expect(images.mock.calls.map(([url]) => url)).toEqual([
    officeUrl("characters/codex-a.png"),
    officeUrl("characters/custom-a.png"),
  ]);
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

test("shares one receptionist download between the native texture and DOM loading image", async () => {
  const image = new Blob(["same PNG bytes"]);
  const bitmap = { width: 1600, height: 96 };
  const fetcher = vi.fn(async () => ({ json: async () => receptionist, blob: async () => image }));
  const decode = vi.fn().mockResolvedValue(bitmap);
  vi.stubGlobal("fetch", fetcher);
  vi.stubGlobal("createImageBitmap", decode);
  const source = new TextureSource({ width: 1600, height: 96 });
  const texture = vi.spyOn(Texture, "from").mockReturnValue(new Texture({ source }));
  const assets = vi.spyOn(Assets, "load");
  await Promise.all([loadCharacters(["receptionist"]), loadCharacters(["receptionist"])]);
  expect(fetcher.mock.calls).toEqual([
    [officeUrl("characters/receptionist.json")],
    [officeUrl("characters/receptionist.png")],
  ]);
  expect(decode).toHaveBeenCalledExactlyOnceWith(image);
  expect(texture).toHaveBeenCalledExactlyOnceWith(bitmap);
  expect(assets).not.toHaveBeenCalled();
  expect(receptionistImage).toBe(image);
  expect(characterSheets.get("receptionist")?.textureSource).toBe(source);
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});
