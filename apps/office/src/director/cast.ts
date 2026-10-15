import type { Texture } from "pixi.js";
import { findPath } from "../scene/path.ts";
import type { Point, Scene, Seat } from "../scene/scene.ts";
import { assignSeats, assignStanding } from "../scene/seats.ts";
import { Character, type CharacterState } from "../stage/character.ts";
import { createSeatCovers } from "../stage/seat-covers.ts";
import type { Stage } from "../stage/stage.ts";
import type { Agent } from "../stage/textures.ts";
import { ZoneSign } from "../stage/zone-sign.ts";
import { deskPoint } from "./desk-point.ts";
import { ActionQueue } from "./queue.ts";

export class Cast {
  readonly agents = new Map<string, Agent>();
  readonly characters = new Map<string, Character>();
  readonly queue = new ActionQueue();
  readonly sleeping = new Set<string>();
  readonly lastActive = new Map<string, number>();
  seats = new Map<string, Seat>();
  readonly present = new Set<string>();
  private labels: ZoneSign[];
  private standing = new Map<string, Seat>();

  constructor(
    readonly stage: Stage,
    readonly scene: Scene,
    private frames: Record<string, Texture>,
    receptionistName: string,
  ) {
    createSeatCovers(stage, scene);
    this.labels = scene.zones.map((zone) => new ZoneSign(stage, zone.name));
    const human: Agent = {
      id: "human",
      name: receptionistName,
      kind: "custom",
      host: "",
      capabilities: [],
      webhookUrl: null,
      lastSeenAt: null,
      createdAt: "",
      status: "online",
    };
    this.agents.set(human.id, human);
    this.seats.set(human.id, scene.frontDesk.human);
    this.add(human);
    this.place("human", scene.frontDesk.human, "sit");
    this.present.add(human.id);
  }

  update(agents: Agent[], initial = false) {
    for (const agent of agents) this.agents.set(agent.id, agent);
    const members = [...this.agents.values()].filter((agent) => agent.id !== "human");
    this.seats = assignSeats(members, this.scene);
    this.standing = assignStanding(members, this.seats, this.scene);
    this.seats = new Map([...this.seats, ...this.standing]);
    this.seats.set("human", this.scene.frontDesk.human);
    let arrivals = 0;
    for (const agent of agents) {
      if (!this.seats.has(agent.id)) continue;
      if (!this.characters.has(agent.id)) this.add(agent);
      if (initial) {
        const character = this.characters.get(agent.id);
        const seat = this.seats.get(agent.id);
        if (character && seat)
          this.place(agent.id, seat, agent.status === "online" ? "sit" : "away");
        if (agent.status === "online") this.present.add(agent.id);
      } else if (agent.status === "online" && !this.present.has(agent.id))
        this.arrive(agent.id, arrivals++ * 500);
      else if (agent.status === "offline" && this.present.delete(agent.id)) {
        void this.enqueue(agent.id, async () => {
          await this.walk(agent.id, { ...this.scene.door, facing: "down" });
          this.characters.get(agent.id)?.setState("away");
        });
      }
    }
    this.scene.zones.forEach((zone, index) => {
      const hosts = [
        ...new Set(
          agents
            .filter((agent) => {
              const seat = this.seats.get(agent.id);
              return seat && zone.seats.includes(seat);
            })
            .map((agent) => agent.host),
        ),
      ];
      const label = this.labels[index];
      if (label) {
        label.setText(hosts.join(" · "));
      }
    });
  }

  private add(agent: Agent) {
    const character = new Character(this.stage, agent, this.frames);
    character.position.copyFrom(this.scene.door);
    character.setState("away");
    this.characters.set(agent.id, character);
    this.stage.characters.addChild(character);
  }

  arrive(id: string, delay = 0) {
    const seat = this.seats.get(id);
    const character = this.characters.get(id);
    if (!seat || !character || this.present.has(id) || id === "human") return;
    this.present.add(id);
    void this.enqueue(id, async () => {
      if (delay) await new Promise((resolve) => setTimeout(resolve, delay));
      character.position.copyFrom(this.scene.door);
      await this.walk(id, seat);
      this.settle(id, "sit");
    });
  }

  nearest(point: Point) {
    return [...this.scene.waypoints].sort(
      (a, b) => Math.hypot(a.x - point.x, a.y - point.y) - Math.hypot(b.x - point.x, b.y - point.y),
    )[0];
  }

  async walk(id: string, target: Seat, speed?: number) {
    const character = this.characters.get(id);
    if (!character || character.destroyed) return;
    const from = this.nearest(character.position);
    if (!from) return;
    await character.walkTo([...findPath(this.scene, from.id, target.via), target], speed);
    character.facing = target.facing;
    character.mirrored = target.mirror === true;
    character.upright = target.upright === true;
  }

  place(id: string, target: Seat, state: CharacterState) {
    const character = this.characters.get(id);
    if (!character) return;
    character.position.copyFrom(target);
    character.facing = target.facing;
    character.mirrored = target.mirror === true;
    character.upright = target.upright === true;
    this.active(id);
    this.settle(id, state);
  }

  settle(id: string, state: CharacterState) {
    const standing = this.standing.has(id) && (state === "sit" || state === "typing");
    this.characters.get(id)?.setState(standing ? "idle" : state);
  }

  active(id: string) {
    this.stage.world.emit("office:active", id);
    this.lastActive.set(id, Date.now());
  }

  enqueue(id: string, action: () => Promise<void> | void) {
    this.active(id);
    return this.queue.enqueue(id, () => {
      this.active(id);
      return action();
    });
  }

  desk(id: string): Point {
    const seat = this.seats.get(id) ?? this.scene.frontDesk.human;
    return deskPoint(seat);
  }
}
