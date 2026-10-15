import { Container, type FederatedPointerEvent, Graphics, Rectangle } from "pixi.js";
import type { Point, Scene } from "../scene/scene.ts";
import { updateSeatCover } from "./seat-covers.ts";
import type { Stage } from "./stage.ts";
export function createEditor(stage: Stage, scene: Scene, onToggle: (active: boolean) => void) {
  const overlay = new Container({ visible: false, eventMode: "static" });
  const lines = new Graphics();
  overlay.addChild(lines);
  stage.world.addChild(overlay);
  const drawEdges = () => {
    lines.clear();
    for (const [a, b] of scene.edges) {
      const from = scene.waypoints.find((point) => point.id === a);
      const to = scene.waypoints.find((point) => point.id === b);
      if (!from || !to) continue;
      lines.moveTo(from.x, from.y).lineTo(to.x, to.y).stroke({ color: 0xffeb96, width: 2 });
    }
  };
  let dragging: { marker: Graphics; point: Point; cover: boolean; offset: Point } | undefined;
  const marker = (point: Point, waypoint: boolean, cover?: { width: number; height: number }) => {
    const graphic = new Graphics();
    if (cover) {
      graphic.rect(0, 0, cover.width, cover.height).fill({ color: 0x77c9d4, alpha: 0.18 });
      graphic.hitArea = new Rectangle(0, 0, cover.width, cover.height);
    } else if (waypoint) graphic.circle(0, 0, 8).fill(0xfcca64);
    else graphic.rect(-9, -9, 18, 18).fill(0x77c9d4);
    graphic.stroke({ color: 0x302a2a, width: 2 });
    graphic.position.copyFrom(point);
    graphic.eventMode = "static";
    graphic.cursor = "move";
    graphic.on("pointerdown", (event: FederatedPointerEvent) => {
      const position = stage.world.toLocal(event.global);
      dragging = {
        marker: graphic,
        point,
        cover: Boolean(cover),
        offset: { x: position.x - point.x, y: position.y - point.y },
      };
    });
    overlay.addChild(graphic);
  };
  for (const point of scene.waypoints) marker(point, true);
  const seats = [
    scene.frontDesk.human,
    ...scene.zones.flatMap((zone) => zone.seats),
    ...scene.meeting.seats,
    ...scene.lounge.spots,
    ...scene.standing,
  ];
  for (const point of seats) {
    if (point.cover) marker(point.cover, false, point.cover);
    marker(point, false);
  }
  marker(scene.bulletin, false);
  drawEdges();
  const move = (event: FederatedPointerEvent) => {
    if (!dragging) return;
    const position = stage.world.toLocal(event.global);
    dragging.point.x = Math.round(position.x - dragging.offset.x);
    dragging.point.y = Math.round(position.y - dragging.offset.y);
    dragging.marker.position.copyFrom(dragging.point);
    if (dragging.cover) updateSeatCover(dragging.point);
    drawEdges();
  };
  const release = () => {
    dragging = undefined;
  };
  stage.app.stage.eventMode = "static";
  stage.app.stage.hitArea = stage.app.screen;
  stage.app.stage
    .on("globalpointermove", move)
    .on("pointerup", release)
    .on("pointerupoutside", release);
  const keydown = (event: KeyboardEvent) => {
    if (event.key.toLowerCase() !== "e" || event.repeat || event.target instanceof HTMLInputElement)
      return;
    overlay.visible = !overlay.visible;
    release();
    onToggle(overlay.visible);
  };
  window.addEventListener("keydown", keydown);
  return {
    async exportJson() {
      const json = `${JSON.stringify(scene, null, 2)}\n`;
      const url = URL.createObjectURL(new Blob([json], { type: "application/json" }));
      const link = document.createElement("a");
      link.href = url;
      link.download = "scene.json";
      link.click();
      URL.revokeObjectURL(url);
      await navigator.clipboard.writeText(json);
    },
    destroy() {
      window.removeEventListener("keydown", keydown);
      stage.app.stage
        .off("globalpointermove", move)
        .off("pointerup", release)
        .off("pointerupoutside", release);
      overlay.destroy({ children: true });
    },
  };
}
