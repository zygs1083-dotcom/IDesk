import { expect, test } from "vitest";
import data from "../../public/scene.json";
import { sceneSchema } from "./scene.ts";

test("seats parse with and without background covers", () => {
  const scene = sceneSchema.parse(data);
  expect(scene.zones.flatMap((zone) => zone.seats).every((seat) => seat.cover)).toBe(true);
  expect(scene.meeting.seats[0]?.cover).toBeUndefined();
});

test.each([0, -1])("cover dimensions reject %s", (dimension) => {
  for (const key of ["width", "height"]) {
    const scene = structuredClone(data);
    const cover = scene.zones[0]?.seats[0]?.cover;
    if (!cover) throw new Error("missing fixture cover");
    Object.assign(cover, { [key]: dimension });
    expect(sceneSchema.safeParse(scene).success).toBe(false);
  }
});

test("seat mirroring accepts only true or omission", () => {
  for (const mirror of [true, false]) {
    const scene = structuredClone(data);
    Object.assign(scene.frontDesk.human, { mirror });
    expect(sceneSchema.safeParse(scene).success).toBe(mirror);
  }
});
