import { expect, test } from "vitest";
import data from "../../public/scene.json";
import { findPath } from "./path.ts";
import { sceneSchema } from "./scene.ts";

const scene = sceneSchema.parse({
  ...data,
  waypoints: [
    { id: "door", x: 0, y: 0 },
    { id: "east", x: 1, y: 0 },
    { id: "center", x: 2, y: 0 },
    { id: "south", x: 3, y: 0 },
    { id: "sw", x: 4, y: 0 },
    { id: "ne", x: 2, y: 1 },
    { id: "nw", x: 2, y: -1 },
  ],
  edges: [
    ["door", "east"],
    ["east", "center"],
    ["center", "south"],
    ["south", "sw"],
    ["ne", "center"],
    ["center", "nw"],
  ],
});
test("A* takes the shortest undirected waypoint route including endpoints", () => {
  const route = findPath(scene, "door", "sw");
  expect(route).toEqual(
    ["door", "east", "center", "south", "sw"].map((id) => {
      const point = scene.waypoints.find((point) => point.id === id);
      if (!point) throw new Error(`Missing waypoint ${id}`);
      const { x, y } = point;
      return { x, y };
    }),
  );
  expect(findPath(scene, "sw", "door")).toEqual([...route].reverse());
  expect(findPath(scene, "ne", "nw")).toEqual(
    ["ne", "center", "nw"].map((id) => {
      const point = scene.waypoints.find((point) => point.id === id);
      if (!point) throw new Error(`Missing waypoint ${id}`);
      const { x, y } = point;
      return { x, y };
    }),
  );
  expect(findPath(scene, "door", "door")).toEqual([route[0]]);
});
test("disconnected or absent waypoints return no path", () => {
  expect(findPath({ ...scene, edges: [] }, "door", "sw")).toEqual([]);
  expect(findPath(scene, "missing", "door")).toEqual([]);
});
