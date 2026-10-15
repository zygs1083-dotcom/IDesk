import { Container, Graphics, Sprite } from "pixi.js";
import type { Point } from "../scene/scene.ts";
import type { Stage } from "./stage.ts";

const covers = new WeakMap<Stage, Map<string, Sprite>>();
const shades = new WeakMap<Container, { shade: Graphics; tint: Graphics }>();
const glows = new WeakMap<Sprite, Sprite>();

export function registerCover(stage: Stage, seat: Point, sprite: Sprite) {
  let seats = covers.get(stage);
  if (!seats) {
    seats = new Map();
    covers.set(stage, seats);
  }
  const clip = new Graphics().rect(0, 0, sprite.width, sprite.height).fill(0xffffff);
  const light = new Container();
  light.mask = clip;
  sprite.addChild(light, clip);
  seats.set(`${seat.x},${seat.y}`, sprite);
}

export function shadeCovers(stage: Stage, shade: Graphics, tint: Graphics) {
  for (const sprite of covers.get(stage)?.values() ?? []) {
    const light = sprite.getChildAt<Container>(0);
    let layers = shades.get(light);
    if (!layers) {
      layers = { shade: new Graphics(shade.context), tint: new Graphics(tint.context) };
      light.addChildAt(layers.shade, 0);
      light.addChildAt(layers.tint, 1);
      shades.set(light, layers);
    }
    for (const [copy, original] of [
      [layers.shade, shade],
      [layers.tint, tint],
    ] as const) {
      copy.position.set(-sprite.x, -sprite.y);
      copy.visible = original.visible;
      copy.alpha = original.alpha;
      copy.blendMode = original.blendMode;
    }
  }
}

export function lightCover(stage: Stage, point: Point, source: Sprite) {
  let glow = glows.get(source);
  const sprite = source.visible && covers.get(stage)?.get(`${point.x},${point.y}`);
  if (sprite) {
    const light = sprite.getChildAt<Container>(0);
    if (!glow) {
      glow = new Sprite(source.texture);
      glow.anchor.copyFrom(source.anchor);
      glow.blendMode = source.blendMode;
      glows.set(source, glow);
    }
    if (glow.parent !== light) light.addChild(glow);
    glow.position.set(source.x - sprite.x, source.y - sprite.y);
  }
  if (glow) glow.visible = Boolean(sprite);
}

export function moveCoverLighting(sprite: Sprite) {
  const light = sprite.getChildAt<Container>(0);
  const layers = shades.get(light);
  if (layers) {
    layers.shade.position.set(-sprite.x, -sprite.y);
    layers.tint.position.copyFrom(layers.shade.position);
  }
}
