import { publicAgentSchema } from "@idesk/shared/agent-schemas";
import { Text } from "pixi.js";
import { z } from "zod";
import { request } from "./lib/api.ts";
import { findPath } from "./scene/path.ts";
import type { Scene } from "./scene/scene.ts";
import { assignSeats } from "./scene/seats.ts";
import { Character } from "./stage/character.ts";
import type { Stage } from "./stage/stage.ts";

export async function direct(stage: Stage, scene: Scene) {
  const agents = z.array(publicAgentSchema).parse(await request("/agents"));
  if (stage.app.stage.destroyed) return;
  const online = agents.filter((agent) => agent.status === "online");
  const seats = assignSeats(online, scene);
  for (const zone of scene.zones) {
    const hosts = [
      ...new Set(
        online
          .filter((agent) => {
            const seat = seats.get(agent.id);
            return seat !== undefined && zone.seats.includes(seat);
          })
          .map((agent) => agent.host),
      ),
    ];
    const label = new Text({
      text: hosts.join(" · "),
      style: {
        fontFamily: "monospace",
        fontSize: 18,
        fill: 0xfff0ce,
        stroke: { color: 0x302a2a, width: 4 },
      },
    });
    label.position.copyFrom(zone.name);
    stage.world.addChild(label);
  }
  for (const agent of online) {
    const seat = seats.get(agent.id);
    if (!seat) continue;
    const character = new Character(stage, agent);
    character.position.copyFrom(scene.door);
    stage.characters.addChild(character);
    const path = findPath(scene, scene.door.via, seat.via);
    void character.walkTo([...path, seat]).then(() => {
      if (character.destroyed) return;
      character.facing = seat.facing;
      character.setState("sit");
    });
  }
}
