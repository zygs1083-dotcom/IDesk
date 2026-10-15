import { TILE } from "@idesk/shared/office-schemas";
import { Container, Graphics, Text } from "pixi.js";
import type { Task } from "../director/events.ts";
import { tween } from "../engine/tween.ts";
import type { Point } from "../world/path.ts";
import { zIndexOf } from "../world/sort.ts";
import type { Stage } from "../world/stage.ts";
import { boardLayout } from "./board-layout.ts";

export class TaskCard extends Container {
  constructor(task: Task) {
    super({ eventMode: "static", cursor: "pointer" });
    const paper = new Graphics()
      .rect(-16, -10, 32, 20)
      .fill(0xfff0ce)
      .stroke({ color: 0x302a2a, width: 2 });
    paper
      .moveTo(-10, -3)
      .lineTo(8, -3)
      .moveTo(-10, 3)
      .lineTo(4, 3)
      .stroke({ color: 0x9a8063, width: 2 });
    if (task.priority === "high" || task.priority === "urgent") {
      paper.rect(9, -9, 6, 6).fill(task.priority === "urgent" ? 0xc64e45 : 0xe4a340);
    }
    this.addChild(paper);
    this.on("pointertap", () =>
      window.dispatchEvent(
        new CustomEvent("office:select", {
          detail: { type: "task", id: task.id },
        }),
      ),
    );
  }
}

export class Cards {
  private cards = new Map<string, TaskCard>();
  private board = new Set<string>();
  private overflow = new Text({
    text: "",
    style: { fontFamily: "Fusion Pixel", fontSize: 12, fill: 0x302a2a },
  });

  private area;

  constructor(private stage: Stage) {
    const object = stage.layout.objects.find((object) => object.item === "whiteboard");
    if (!object) throw new Error("Missing whiteboard");
    const item = stage.catalog.items[object.item];
    const part = item?.parts[0];
    if (!part || !item?.textArea) throw new Error("Missing board textArea");
    this.area = {
      ...item.textArea,
      x: object.x * TILE + part.dx + item.textArea.x,
      y: object.y * TILE + part.dy + item.textArea.y,
    };
    stage.board.addChild(this.overflow);
  }

  get(task: Task) {
    let card = this.cards.get(task.id);
    if (!card) {
      card = new TaskCard(task);
      this.cards.set(task.id, card);
      this.stage.effects.addChild(card);
    }
    return card;
  }

  position(card: TaskCard): Point {
    return this.stage.world.toLocal(card.toGlobal({ x: 0, y: 0 }));
  }

  carry(task: Task, character: Container) {
    this.detach(task.id);
    const card = this.get(task);
    character.addChild(card);
    card.visible = true;
    card.scale.set(1);
    card.position.set(20, -48);
  }

  private ground(card: TaskCard) {
    const point = this.position(card);
    this.stage.effects.addChild(card);
    card.position.copyFrom(point);
  }

  place(task: Task, point: Point & { sortY: number }) {
    this.detach(task.id);
    const card = this.get(task);
    this.ground(card);
    this.stage.objects.addChild(card);
    card.zIndex = zIndexOf(point.sortY, 1);
    card.scale.set(1);
    card.visible = true;
    card.position.copyFrom(point);
  }

  detach(id: string) {
    this.board.delete(id);
    this.layout();
  }

  private layout() {
    const { x, y, w, h } = this.area;
    const arrangement = boardLayout(w, h, this.board.size);
    [...this.board].forEach((id, index) => {
      const card = this.cards.get(id);
      if (!card) return;
      const point = arrangement.point(index);
      card.visible = index < arrangement.visible;
      card.position.set(x + point.x, y + point.y);
    });
    this.overflow.text = arrangement.overflow ? `+${arrangement.overflow}` : "";
    this.overflow.position.set(
      x + arrangement.overflowPoint.x - 8,
      y + arrangement.overflowPoint.y - 5,
    );
  }

  pin(task: Task) {
    const card = this.get(task);
    this.stage.board.addChild(card);
    card.scale.set(0.5);
    this.board.add(task.id);
    this.layout();
    return card;
  }

  async fly(task: Task, point: Point) {
    this.detach(task.id);
    const card = this.get(task);
    this.ground(card);
    card.visible = true;
    card.scale.set(1);
    const ms = Math.min(600, Math.hypot(card.x - point.x, card.y - point.y) * 2);
    await tween(this.stage.app.ticker, card.position, point, ms);
  }

  async toBoard(task: Task, from?: Point, bounce = false) {
    const card = this.pin(task);
    const target = { x: card.x, y: card.y };
    const visible = card.visible;
    if (from) {
      card.position.copyFrom(from);
      await this.fly(task, target);
      this.pin(task);
    }
    if (bounce && visible) {
      await tween(this.stage.app.ticker, card.scale, { x: 0.6, y: 0.6 }, 120);
      await tween(this.stage.app.ticker, card.scale, { x: 0.5, y: 0.5 }, 120);
    }
  }

  remove(id: string) {
    this.detach(id);
    this.cards.get(id)?.destroy({ children: true });
    this.cards.delete(id);
  }
}
