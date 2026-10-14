import { Container, Graphics, Text } from "pixi.js";
import type { Task } from "../director/events.ts";
import { tween } from "../engine/tween.ts";
import type { Point, Scene } from "../scene/scene.ts";
import type { Stage } from "./stage.ts";

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

  constructor(
    private stage: Stage,
    private scene: Scene,
  ) {
    this.overflow.position.set(
      scene.taskBoard.x + scene.taskBoard.width - 32,
      scene.taskBoard.y + scene.taskBoard.height - 22,
    );
    stage.world.addChild(this.overflow);
  }

  get(task: Task) {
    let card = this.cards.get(task.id);
    if (!card) {
      card = new TaskCard(task);
      this.cards.set(task.id, card);
      this.stage.world.addChild(card);
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
    card.position.set(20, -48);
  }

  private ground(card: TaskCard) {
    const point = this.position(card);
    this.stage.world.addChild(card);
    card.position.copyFrom(point);
  }

  place(task: Task, point: Point) {
    this.detach(task.id);
    const card = this.get(task);
    this.ground(card);
    card.visible = true;
    card.position.copyFrom(point);
  }

  detach(id: string) {
    this.board.delete(id);
    this.layout();
  }

  private layout() {
    const { x, y, width, height } = this.scene.taskBoard;
    const columns = Math.floor(width / 42);
    const rows = Math.floor(height / 30);
    const capacity = columns * rows - 1;
    [...this.board].forEach((id, index) => {
      const card = this.cards.get(id);
      if (!card) return;
      card.visible = index < capacity;
      card.position.set(x + 22 + (index % columns) * 42, y + 16 + Math.floor(index / columns) * 30);
    });
    this.overflow.text = this.board.size > capacity ? `+${this.board.size - capacity}` : "";
  }

  pin(task: Task) {
    const card = this.get(task);
    this.ground(card);
    this.board.add(task.id);
    this.layout();
    return card;
  }

  async fly(task: Task, point: Point) {
    this.detach(task.id);
    const card = this.get(task);
    this.ground(card);
    card.visible = true;
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
      await tween(this.stage.app.ticker, card.scale, { x: 1.15, y: 1.15 }, 120);
      await tween(this.stage.app.ticker, card.scale, { x: 1, y: 1 }, 120);
    }
  }

  remove(id: string) {
    this.detach(id);
    this.cards.get(id)?.destroy({ children: true });
    this.cards.delete(id);
  }
}
