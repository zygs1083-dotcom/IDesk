import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { copyText } from "./clipboard.ts";

class ActiveElement {
  closest = vi.fn();
  focus = vi.fn();
}

const activeElement = new ActiveElement();
const textarea = { value: "", readOnly: false, select: vi.fn(), remove: vi.fn() };
const dialog = { append: vi.fn() };
const document = {
  activeElement: activeElement as ActiveElement | null,
  body: { append: vi.fn() },
  createElement: vi.fn(),
  execCommand: vi.fn(),
};

beforeEach(() => {
  vi.resetAllMocks();
  activeElement.closest.mockReturnValue(null);
  textarea.value = "";
  textarea.readOnly = false;
  document.activeElement = activeElement;
  document.createElement.mockReturnValue(textarea);
  document.execCommand.mockReturnValue(true);
  vi.stubGlobal("navigator", {});
  vi.stubGlobal("document", document);
  vi.stubGlobal("HTMLElement", ActiveElement);
});
afterEach(() => vi.unstubAllGlobals());

test("uses the Clipboard API when available", async () => {
  const writeText = vi.fn().mockResolvedValue(undefined);
  vi.stubGlobal("navigator", { clipboard: { writeText } });
  await copyText("setup\nmessage");
  expect(writeText).toHaveBeenCalledWith("setup\nmessage");
  expect(document.createElement).not.toHaveBeenCalled();
});

test("propagates Clipboard API failures", async () => {
  const error = new Error("Clipboard denied");
  vi.stubGlobal("navigator", { clipboard: { writeText: vi.fn().mockRejectedValue(error) } });
  await expect(copyText("message")).rejects.toBe(error);
  expect(document.execCommand).not.toHaveBeenCalled();
});

test("copies through a selected readonly textarea without the Clipboard API", async () => {
  await copyText("setup\nmessage");
  expect(document.createElement).toHaveBeenCalledWith("textarea");
  expect(textarea.value).toBe("setup\nmessage");
  expect(textarea.readOnly).toBe(true);
  expect(document.body.append).toHaveBeenCalledWith(textarea);
  expect(textarea.select).toHaveBeenCalledBefore(document.execCommand);
  expect(document.execCommand).toHaveBeenCalledWith("copy");
  expect(textarea.remove).toHaveBeenCalledAfter(document.execCommand);
  expect(activeElement.focus).toHaveBeenCalledAfter(textarea.remove);
});

test("places the temporary textarea inside the active dialog and cleans it up", async () => {
  activeElement.closest.mockReturnValue(dialog);
  await copyText("message");
  expect(activeElement.closest).toHaveBeenCalledWith("dialog");
  expect(dialog.append).toHaveBeenCalledWith(textarea);
  expect(document.body.append).not.toHaveBeenCalled();
  expect(textarea.remove).toHaveBeenCalledOnce();
  expect(activeElement.focus).toHaveBeenCalledAfter(textarea.remove);
});

test("throws when execCommand returns false and still removes the textarea and restores focus", async () => {
  activeElement.closest.mockReturnValue(dialog);
  document.execCommand.mockReturnValue(false);
  await expect(copyText("message")).rejects.toThrow("Copy failed");
  expect(textarea.remove).toHaveBeenCalledOnce();
  expect(activeElement.focus).toHaveBeenCalledAfter(textarea.remove);
});

test("cleans up and restores focus when execCommand throws", async () => {
  const error = new Error("Copy blocked");
  document.execCommand.mockImplementation(() => {
    throw error;
  });
  await expect(copyText("message")).rejects.toBe(error);
  expect(textarea.remove).toHaveBeenCalledOnce();
  expect(activeElement.focus).toHaveBeenCalledAfter(textarea.remove);
});

test("uses the body when there is no active element", async () => {
  document.activeElement = null;
  await copyText("message");
  expect(document.body.append).toHaveBeenCalledWith(textarea);
  expect(textarea.remove).toHaveBeenCalledOnce();
  expect(activeElement.focus).not.toHaveBeenCalled();
});
