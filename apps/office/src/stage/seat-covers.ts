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
  // 桌面和显示器上沿都要画在坐着的人之上、前排的人之下，所以按座位排序而不是按切片底边。
  for (const seat of seats) {
    for (const cover of seat.covers ?? []) {
      const { x, y, width, height } = cover;
      const texture = new Texture({
        source: stage.background.source,
        frame: new Rectangle(x, y, width, height),
        dynamic: true,
      });
      const sprite = new Sprite(texture);
      sprites.set(cover, sprite);
      sprite.position.set(x, y);
      sprite.zIndex = seat.y + 1;
      stage.characters.addChild(sprite);
    }
  }
}

export function updateSeatCover(point: Point) {
  const sprite = sprites.get(point);
  if (!sprite) return;
  sprite.texture.frame.x = point.x;
  sprite.texture.frame.y = point.y;
  sprite.texture.update();
  sprite.position.copyFrom(point);
}
