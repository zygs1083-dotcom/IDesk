import type { Texture } from "pixi.js";
import { Character, type CharacterState } from "../stage/character.ts";
import type { Agent, OfficeAgent } from "../stage/textures.ts";
import { cellOf, findPath } from "../world/path.ts";
import {
  assignSeats,
  assignStanding,
  type Seat,
  type Standing,
  type Target,
  workSpot,
} from "../world/places.ts";
import { Plaque } from "../world/plaque.ts";
import type { Stage } from "../world/stage.ts";
import { ActionQueue } from "./queue.ts";

export class Cast {
  readonly agents = new Map<string, OfficeAgent>();
  readonly characters = new Map<string, Character>();
  readonly queue = new ActionQueue();
  readonly sleeping = new Set<string>();
  readonly lastActive = new Map<string, number>();
  seats = new Map<string, Seat | Standing>();
  readonly present = new Set<string>();
  private labels: Plaque[];
  private standing = new Map<string, Standing>();

  constructor(
    readonly stage: Stage,
    private frames: Record<string, Texture>,
    receptionistName: string,
  ) {
    this.labels = stage.layout.zones.map((zone) => new Plaque(stage, zone.plaque));
    const reception = stage.layout.seats.find((seat) => seat.id === stage.layout.reception.seat);
    if (!reception) throw new Error("Missing reception seat");
    const human: OfficeAgent = {
      id: "human",
      name: receptionistName,
      kind: "receptionist",
      host: "",
      capabilities: [],
      webhookUrl: null,
      lastSeenAt: null,
      createdAt: "",
      status: "online",
    };
    this.agents.set(human.id, human);
    this.seats.set(human.id, reception);
    this.add(human);
    this.place("human", reception, "sit");
    this.present.add(human.id);
  }

  update(agents: Agent[], initial = false) {
    for (const agent of agents) this.agents.set(agent.id, agent);
    const members = [...this.agents.values()].filter((agent) => agent.id !== "human");
    this.seats = assignSeats(members, this.stage.layout);
    this.standing = assignStanding(members, this.seats, this.stage.layout);
    this.seats = new Map([...this.seats, ...this.standing]);
    this.seats.set("human", this.reception);
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
          await this.walk(agent.id, {
            ...this.stage.layout.points.door,
            facing: "down",
          });
          this.characters.get(agent.id)?.setState("away");
        });
      }
    }
    this.stage.layout.zones.forEach((zone, index) => {
      const hosts = [
        ...new Set(
          agents
            .filter((agent) => {
              const seat = this.seats.get(agent.id);
              return seat && seat.zone === zone.id;
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

  private add(agent: OfficeAgent) {
    const character = new Character(this.stage, agent, this.frames);
    character.position.copyFrom(this.stage.layout.points.door);
    character.setState("away");
    this.characters.set(agent.id, character);
    this.stage.objects.addChild(character);
  }

  arrive(id: string, delay = 0) {
    const seat = this.seats.get(id);
    const character = this.characters.get(id);
    if (!seat || !character || this.present.has(id) || id === "human") return;
    this.present.add(id);
    void this.enqueue(id, async () => {
      if (delay) await new Promise((resolve) => setTimeout(resolve, delay));
      character.position.copyFrom(this.stage.layout.points.door);
      await this.walk(id, seat);
      this.settle(id, "sit");
    });
  }

  async walk(id: string, target: Target, speed?: number) {
    const character = this.characters.get(id);
    if (!character || character.destroyed) return;
    const start = cellOf(character.position);
    const path = findPath(this.stage.layout, start, cellOf(target));
    if (!path.length) return;
    await character.walkTo([...path, target], speed);
    character.facing = target.facing;
    character.mirror = target.mirror === true;
  }

  place(id: string, target: Target, state: CharacterState) {
    const character = this.characters.get(id);
    if (!character) return;
    character.position.copyFrom(target);
    character.facing = target.facing;
    character.mirror = target.mirror === true;
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

  get reception() {
    return this.stage.layout.seats.find(
      (seat) => seat.id === this.stage.layout.reception.seat,
    ) as Seat;
  }

  desk(id: string) {
    const seat = this.seats.get(id);
    return seat && "workSpot" in seat
      ? workSpot(seat.workSpot, seat.y, this.stage.layout)
      : undefined;
  }
}
