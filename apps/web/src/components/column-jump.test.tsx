import { afterEach, expect, test, vi } from "vitest";
import { ColumnJump } from "./column-jump.tsx";

vi.mock("../i18n/lang.tsx", () => ({ useLang: () => ({ t: () => "Jump" }) }));
afterEach(() => vi.unstubAllGlobals());
test("column selection scrolls the target within the horizontal board", () => {
  const scrollIntoView = vi.fn();
  const getElementById = vi.fn(() => ({ scrollIntoView }));
  vi.stubGlobal("document", { getElementById });
  const select = ColumnJump({ options: [{ id: "task-column-done", label: "Done" }] });
  select.props.onChange({ target: { value: "task-column-done" } });
  expect(getElementById).toHaveBeenCalledWith("task-column-done");
  expect(scrollIntoView).toHaveBeenCalledWith({ block: "nearest", inline: "start" });
});
