import { playSound } from "../engine/sound.ts";
import { envelope } from "../stage/effects.ts";
import type { Cast } from "./cast.ts";
import { destinations } from "./destinations.ts";
import type { Intent } from "./intents.ts";

export function relayAction(cast: Cast) {
  const { stage, characters } = cast;
  const places = destinations(stage);
  return (intent: Extract<Intent, { kind: "relay" }>) => {
    const { agentId, to } = intent;
    const recipients =
      to.kind === "agent"
        ? [to.id]
        : to.kind === "capability"
          ? [...cast.present].filter((id) => cast.agents.get(id)?.capabilities.includes(to.value))
          : [];
    void cast.enqueue(agentId, async () => {
      const from = characters.get(agentId)?.position ?? cast.reception;
      if (to.kind === "broadcast") {
        await envelope(stage, from, places.bulletin);
        playSound("envelope");
      } else
        await Promise.all(
          recipients.map(async (id) => {
            const target = cast.desk(id) ?? characters.get(id)?.position;
            if (target) await envelope(stage, from, target);
            playSound("envelope");
            void cast.enqueue(id, async () => {
              const character = characters.get(id);
              if (!character) return;
              await character.nod(150, 1);
            });
          }),
        );
    });
  };
}
