import { Character } from "../src/stage/character.ts";
import { initialGlyphs, loadGlyphs } from "../src/stage/glyphs.ts";
import { loadWorldAssets } from "../src/world/assets.ts";
import { loadCharacters } from "../src/world/characters.ts";
import { loadLayout } from "../src/world/layout.ts";
import { cellCenter, walkableGrid } from "../src/world/path.ts";
import { createStage } from "../src/world/stage.ts";

export async function bubbleStage() {
  const layout = await loadLayout();
  const assets = await loadWorldAssets();
  await loadCharacters(["codex-a", "claude-code-a", "custom-a"]);
  await loadGlyphs(initialGlyphs);
  document.body.style.cssText = "margin:0;width:100vw;height:100vh;overflow:hidden";
  const stage = await createStage(document.body, layout, assets);
  stage.app.ticker.maxFPS = 15;
  const people = ["codex", "claude-code", "custom"].map((kind, index) => {
    const person = new Character(stage, { id: `${index}`, name: kind, kind }, assets.sprites);
    stage.objects.addChild(person);
    return person;
  });
  return {
    stage,
    people,
    edgeHeads() {
      const frame = assets.sprites["codex-a/walk/down/0"];
      const headHeight = frame.height * frame.defaultAnchor.y + 8;
      const heads = walkableGrid(layout).flatMap((row, y) =>
        row.flatMap((walkable, x) => {
          if (!walkable) return [];
          const feet = cellCenter({ x, y });
          if (
            feet.x - frame.width * frame.defaultAnchor.x < 0 ||
            feet.x + frame.width * (1 - frame.defaultAnchor.x) > layout.size.w ||
            feet.y - frame.height * frame.defaultAnchor.y < 0 ||
            feet.y + frame.height * (1 - frame.defaultAnchor.y) > layout.size.h
          )
            return [];
          return [stage.world.toGlobal({ x: feet.x, y: feet.y - headHeight })];
        }),
      );
      return [
        heads.reduce((a, b) => (a.x <= b.x ? a : b)),
        heads.reduce((a, b) => (a.x >= b.x ? a : b)),
        heads.reduce((a, b) => (a.y <= b.y ? a : b)),
      ].map(({ x, y }) => ({ x, y }));
    },
    place(points) {
      for (const [index, person] of people.entries()) {
        person.bubble.hide();
        const point = points[index];
        person.setState(point ? "idle" : "away");
        if (!point) continue;
        const world = stage.world.toLocal(point);
        person.position.set(world.x, world.y + 104);
      }
    },
    sample() {
      return people.map(({ bubble }) => ({
        visible: bubble.visible,
        text: bubble.children[1].text,
        rect: { x: bubble.x, y: bubble.y, ...bubble.input() },
        bounds: bubble.getBounds(),
        tailBounds: bubble.tail.getBounds(),
        tail: bubble.tailPath,
      }));
    },
  };
}
