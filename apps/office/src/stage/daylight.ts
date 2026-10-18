import { Graphics, Sprite, Texture } from "pixi.js";
import type { LightScene } from "../world/assets.ts";
import { loadScene } from "../world/assets.ts";
import type { Stage } from "../world/stage.ts";
import type { Character } from "./character.ts";
import { clockAngles, type DaylightWeights, daylightWeights, officeNow } from "./daylight-time.ts";

const scenes: LightScene[] = ["day", "dusk", "night"];

export function createDaylight(
  stage: Stage,
  characters: Map<string, Character>,
  clock: () => Date = officeNow,
  replay = false,
) {
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
  const hands = new Graphics();
  stage.board.addChild(hands);
  const loaded = new Set<LightScene>([stage.assets.initial]);
  const displayed: DaylightWeights = { day: 0, dusk: 0, night: 0 };
  displayed[stage.assets.initial] = 1;
  let start = { ...displayed };
  let target = { ...displayed };
  let elapsed = 2000;
  let sampledAt = clock().getTime();
  let clockMinute = -1;
  const { x, y, r } = stage.layout.clock;

  const drawClock = (date: Date) => {
    const minute = Math.floor(date.getTime() / 60_000);
    if (minute === clockMinute) return;
    clockMinute = minute;
    const angles = clockAngles(date);
    hands
      .clear()
      .circle(x, y, r - 5)
      .fill(0xe7d6ba);
    for (const [angle, length] of [
      [angles.hour, r * 0.44],
      [angles.minute, r * 0.67],
    ] as const) {
      hands
        .moveTo(x, y)
        .lineTo(Math.round(x + Math.sin(angle) * length), Math.round(y - Math.cos(angle) * length))
        .stroke({ color: 0x30292a, width: 2, cap: "square" });
    }
    hands.rect(x - 1, y - 1, 3, 3).fill(0x30292a);
  };

  const retarget = () => {
    const date = clock();
    sampledAt = date.getTime();
    drawClock(date);
    const weights = daylightWeights(date);
    const available = scenes.reduce(
      (sum, scene) => sum + (loaded.has(scene) ? weights[scene] : 0),
      0,
    );
    start = { ...displayed };
    target = { day: 0, dusk: 0, night: 0 };
    if (available === 0) target[stage.assets.initial] = 1;
    else for (const scene of loaded) target[scene] = weights[scene] / available;
    elapsed = 0;
  };

  const tick = ({ deltaMS }: { deltaMS: number }) => {
    const date = clock();
    drawClock(date);
    if (replay && Math.abs(date.getTime() - sampledAt) >= 30_000) retarget();
    elapsed = Math.min(2000, elapsed + deltaMS);
    const t = elapsed / 2000;
    for (const scene of scenes)
      displayed[scene] = start[scene] + (target[scene] - start[scene]) * t;
    let cumulative = 0;
    for (const scene of scenes) {
      const sprites = stage.scenes.sprites.get(scene);
      if (!sprites) continue;
      cumulative += displayed[scene];
      const alpha = cumulative > 0 ? displayed[scene] / cumulative : 0;
      for (const sprite of sprites) sprite.alpha = alpha;
    }
    for (const glow of glows.values()) glow.visible = false;
    if (displayed.night <= 0) return;
    for (const character of characters.values()) {
      if (character.state !== "sit" && character.state !== "typing") continue;
      const seat = stage.layout.seats.find(
        (seat) => seat.x === character.x && seat.y === character.y,
      );
      if (!seat) continue;
      const desk = seat.workSpot;
      const key = `${desk.x},${desk.y}`;
      let glow = glows.get(key);
      if (!glow) {
        glow = new Sprite(texture);
        glow.blendMode = "add";
        glow.anchor.set(0.5);
        glow.position.copyFrom(desk);
        stage.lights.addChild(glow);
        glows.set(key, glow);
      }
      glow.alpha = displayed.night;
      glow.visible = true;
    }
  };

  retarget();
  tick({ deltaMS: 2000 });
  stage.app.ticker.add(tick);
  const timer = setInterval(retarget, 30_000);
  const idle = requestIdleCallback(() => {
    for (const scene of scenes) {
      if (loaded.has(scene)) continue;
      void loadScene(scene).then((assets) => {
        if (stage.world.destroyed) return;
        stage.scenes.addScene(scene, assets);
        loaded.add(scene);
        retarget();
      });
    }
  });
  stage.world.on("destroyed", () => {
    clearInterval(timer);
    cancelIdleCallback(idle);
    stage.app.ticker.remove(tick);
    texture.destroy(true);
  });
}
