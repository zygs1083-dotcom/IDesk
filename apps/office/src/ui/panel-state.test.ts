import { expect, test } from "vitest";
import { isFullscreenKey, readPanels, savePanels } from "./panel-state.ts";

test("panel states survive storage and invalid data resets to open", () => {
  const values = new Map<string, string>();
  const storage = {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => {
      values.set(key, value);
    },
  };
  expect(readPanels(storage)).toEqual({ top: true, left: true, right: true });
  savePanels(storage, { top: false, left: true, right: false });
  expect(readPanels(storage)).toEqual({ top: false, left: true, right: false });
  values.set("office.panels", "broken");
  expect(readPanels(storage)).toEqual({ top: true, left: true, right: true });
});

test("F shortcut ignores focused inputs and modified keys", () => {
  const event = {
    key: "f",
    repeat: false,
    altKey: false,
    ctrlKey: false,
    metaKey: false,
    target: null,
  };
  expect(isFullscreenKey(event)).toBe(true);
  expect(
    isFullscreenKey({ ...event, target: Object.assign(new EventTarget(), { tagName: "INPUT" }) }),
  ).toBe(false);
  expect(
    isFullscreenKey({
      ...event,
      target: Object.assign(new EventTarget(), { tagName: "TEXTAREA" }),
    }),
  ).toBe(false);
  expect(
    isFullscreenKey({
      ...event,
      target: Object.assign(new EventTarget(), { isContentEditable: true }),
    }),
  ).toBe(false);
  expect(isFullscreenKey({ ...event, ctrlKey: true })).toBe(false);
});
