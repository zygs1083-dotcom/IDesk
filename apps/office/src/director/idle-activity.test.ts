import { Container } from "pixi.js";
import { expect, test, vi } from "vitest";
import { Cast } from "./cast.ts";
import { ActionQueue } from "./queue.ts";

vi.hoisted(() => vi.stubGlobal("matchMedia", () => ({ matches: false })));

function activityCast() {
  const cast: Cast = Object.create(Cast.prototype);
  const world = new Container();
  const wake = vi.fn();
  world.on("office:active", wake);
  Object.assign(cast, { queue: new ActionQueue(), lastActive: new Map(), stage: { world } });
  return { cast, wake };
}

test("idle queue actions and returning to a seat preserve the real activity clock", async () => {
  const { cast, wake } = activityCast();
  Object.assign(cast, { characters: new Map(), standing: new Map() });
  cast.lastActive.set("a", 12);
  await cast.queue.enqueue("a", () => cast.settle("a", "sit"));
  expect(cast.lastActive.get("a")).toBe(12);
  expect(wake).not.toHaveBeenCalled();
});

test("real events wake immediately and reset activity when their queue action starts", async () => {
  const { cast, wake } = activityCast();
  const clock = vi.spyOn(Date, "now").mockReturnValue(180_000);
  cast.lastActive.set("a", 0);
  const action = cast.enqueue("a", () => {});
  expect(cast.lastActive.get("a")).toBe(180_000);
  expect(wake).toHaveBeenCalledWith("a");
  clock.mockReturnValue(180_010);
  await action;
  expect(cast.lastActive.get("a")).toBe(180_010);
  clock.mockRestore();
});

test("self waking resets the clock before another sleep check", () => {
  const { cast, wake } = activityCast();
  const clock = vi.spyOn(Date, "now").mockReturnValue(240_000);
  cast.lastActive.set("a", 0);
  cast.active("a");
  expect(cast.lastActive.get("a")).toBe(240_000);
  expect(wake).toHaveBeenCalledWith("a");
  clock.mockRestore();
});
