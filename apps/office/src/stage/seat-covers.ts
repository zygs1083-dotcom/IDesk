import { Rectangle, Sprite, Texture } from "pixi.js";
import type { Point, Scene } from "../scene/scene.ts";
import type { Stage } from "./stage.ts";

const sprites = new WeakMap<Point, Sprite>();

export function createSeatCovers(stage: Stage, scene: Scene) {
  const seats = [
    scene.frontDesk.human,
    ...scene.zones.flatMap((zone) => zone.seats),
    ...scene.meeting.seats,
  ];
  for (const seat of seats) {
    if (!seat.cover) continue;
    const { x, y, width, height } = seat.cover;
    const texture = new Texture({
      source: stage.background.source,
      frame: new Rectangle(x, y, width, height),
      dynamic: true,
    });
    const sprite = new Sprite(texture);
    sprites.set(seat.cover, sprite);
    sprite.position.set(x, y);
    sprite.zIndex = y + height;
    stage.characters.addChild(sprite);
  }
}

export function updateSeatCover(point: Point) {
  const sprite = sprites.get(point);
  if (!sprite) return;
  const { height } = sprite.texture.frame;
  sprite.texture.frame.x = point.x;
  sprite.texture.frame.y = point.y;
  sprite.texture.update();
  sprite.position.copyFrom(point);
  sprite.zIndex = point.y + height;
}
