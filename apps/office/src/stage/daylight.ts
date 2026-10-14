import { Container, Graphics, Sprite, Texture } from "pixi.js";
import type { Character } from "./character.ts";
import type { Stage } from "./stage.ts";

export function phase(date: Date): "day" | "dusk" | "night" {
  const hour = date.getHours();
  if (hour < 6 || hour >= 20) return "night";
  if (hour < 8 || hour >= 18) return "dusk";
  return "day";
}

export function createDaylight(stage: Stage, characters: Map<string, Character>) {
  const background = stage.world.getChildAt<Sprite>(0);
  const shade = new Graphics();
  const lights = new Container();
  stage.world.addChildAt(shade, 1);
  stage.world.addChildAt(lights, 2);
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 48;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Warm light canvas unavailable");
  const gradient = context.createRadialGradient(24, 24, 0, 24, 24, 24);
  gradient.addColorStop(0, "rgba(255, 210, 122, 0.5)");
  gradient.addColorStop(1, "rgba(255, 210, 122, 0)");
  context.fillStyle = gradient;
  context.fillRect(0, 0, 48, 48);
  const texture = Texture.from(canvas);
  const glows = new Map<string, Sprite>();
  let current = phase(new Date());
  let editing = false;
  const updateShade = () => {
    current = phase(new Date());
    shade.clear().rect(0, 0, background.width, background.height);
    shade.fill(current === "night" ? 0x1a2340 : 0xff9a3c);
    shade.alpha = current === "night" ? 0.4 : 0.15;
    shade.blendMode = current === "night" ? "multiply" : "normal";
    shade.visible = !editing && current !== "day";
    lights.visible = !editing && current === "night";
  };
  const updateLights = () => {
    for (const [id, glow] of glows) {
      if (characters.has(id)) continue;
      glow.destroy();
      glows.delete(id);
    }
    for (const [id, character] of characters) {
      let glow = glows.get(id);
      if (!glow) {
        glow = new Sprite(texture);
        glow.anchor.set(0.5);
        lights.addChild(glow);
        glows.set(id, glow);
      }
      glow.visible =
        !editing &&
        current === "night" &&
        (character.state === "sit" || character.state === "typing");
      glow.position.set(character.x, character.y - 106);
    }
  };
  updateShade();
  stage.app.ticker.add(updateLights);
  const timer = setInterval(updateShade, 60_000);
  stage.world.on("destroyed", () => {
    clearInterval(timer);
    stage.app.ticker.remove(updateLights);
    texture.destroy(true);
  });
  return {
    setEditing(active: boolean) {
      editing = active;
      updateShade();
      updateLights();
    },
  };
}
