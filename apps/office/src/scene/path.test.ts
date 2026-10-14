import { expect, test } from "vitest";
import data from "../../public/scene.json";
import { findPath } from "./path.ts";
import { sceneSchema } from "./scene.ts";

const scene = sceneSchema.parse(data);
test("A* takes the shortest undirected waypoint route including endpoints", () => {
  const route = findPath(scene, "door", "sw");
  expect(route).toEqual(
    ["door", "east", "center", "south", "sw"].map((id) => {
      const { x, y } = scene.waypoints.find((point) => point.id === id)!;
      return { x, y };
    }),
  );
  expect(findPath(scene, "sw", "door")).toEqual([...route].reverse());
  expect(findPath(scene, "ne", "nw")).toEqual(
    ["ne", "center", "nw"].map((id) => {
      const { x, y } = scene.waypoints.find((point) => point.id === id)!;
      return { x, y };
    }),
  );
  expect(findPath(scene, "door", "door")).toEqual([route[0]]);
});
test("disconnected or absent waypoints return no path", () => {
  expect(findPath({ ...scene, edges: [] }, "door", "sw")).toEqual([]);
  expect(findPath(scene, "missing", "door")).toEqual([]);
});
