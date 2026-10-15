import { Container, Graphics, Sprite, Texture } from "pixi.js";
import type { Stage } from "../world/stage.ts";
import type { Character } from "./character.ts";

export function phase(date: Date): "day" | "dusk" | "night" {
  const hour = date.getHours();
  if (hour < 6 || hour >= 20) return "night";
  if (hour < 8 || hour >= 18) return "dusk";
  return "day";
}

export function createDaylight(stage: Stage, characters: Map<string, Character>, hour?: number) {
  const available = stage.layout.seats;
  const width = stage.layout.size.w;
  const height = stage.layout.size.h;
  const shade = new Graphics();
  const tint = new Graphics().rect(0, 0, width, height).fill({ color: 0x1a2340, alpha: 0.25 });
  const lights = new Container();
  stage.lights.addChild(shade, tint, lights);
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 80;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("无法创建暖光画布");
  const gradient = context.createRadialGradient(40, 40, 0, 40, 40, 40);
  gradient.addColorStop(0, "rgba(255, 210, 122, 0.5)");
  gradient.addColorStop(1, "rgba(255, 210, 122, 0)");
  context.fillStyle = gradient;
  context.fillRect(0, 0, 80, 80);
  const texture = Texture.from(canvas);
  const glows = new Map<string, Sprite>();
  let current: ReturnType<typeof phase>;
  const updateShade = () => {
    const date = new Date();
    if (hour !== undefined) date.setHours(hour);
    current = phase(date);
    shade
      .clear()
      .rect(0, 0, width, height)
      .fill(current === "night" ? 0x1a2340 : 0xff9a3c);
    shade.alpha = current === "night" ? 0.6 : 0.2;
    shade.blendMode = current === "night" ? "multiply" : "normal";
    shade.visible = current !== "day";
    tint.visible = lights.visible = current === "night";
  };
  const updateLights = () => {
    for (const glow of glows.values()) glow.visible = false;
    for (const character of characters.values()) {
      if (character.state !== "sit" && character.state !== "typing") continue;
      const seat = available.find((seat) => seat.x === character.x && seat.y === character.y);
      const desk = seat?.workSpot;
      if (!desk) continue;
      const key = `${desk.x},${desk.y}`;
      let glow = glows.get(key);
      if (!glow) {
        glow = new Sprite(texture);
        glow.blendMode = "add";
        glow.anchor.set(0.5);
        glow.position.copyFrom(desk);
        lights.addChild(glow);
        glows.set(key, glow);
      }
      glow.visible = current === "night";
    }
  };
  updateShade();
  updateLights();
  stage.app.ticker.add(updateLights);
  const timer = setInterval(updateShade, 60_000);
  stage.world.on("destroyed", () => {
    clearInterval(timer);
    stage.app.ticker.remove(updateLights);
    texture.destroy(true);
  });
}
