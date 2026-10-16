import { playSound } from "../engine/sound.ts";
import type { Cards } from "../stage/card.ts";
import { WALK_SPEED } from "../stage/character.ts";
import { confetti } from "../stage/effects.ts";
import { cellCenter } from "../world/path.ts";
import { departure } from "../world/places.ts";
import type { Cast } from "./cast.ts";
import { destinations } from "./destinations.ts";
import type { OfficeEvent, Task } from "./events.ts";
import { type Intent, intentions } from "./intents.ts";
import { relayAction } from "./relay.ts";

const ALERT_MS = 800;
const RUN_MULTIPLIER = 1.3;

type ActionEvent = OfficeEvent & { task: Task | undefined; previous: Task | undefined };

export function createActions(cast: Cast, cards: Cards) {
  const { stage, queue, characters } = cast;
  const places = destinations(stage);
  const placeCard = (task: Task, id: string) => {
    const desk = cast.desk(id);
    const character = characters.get(id);
    if (desk) cards.place(task, desk);
    else if (character) cards.carry(task, character);
  };
  const home = async (id: string, state: "sit" | "typing") => {
    const seat = cast.seats.get(id);
    if (!seat) return;
    await cast.walk(id, seat);
    cast.settle(id, state);
  };
  const flights = new Map<string, Promise<void>>();
  const taskAction = (task: Task, id: string, action: () => Promise<void>, interrupt = true) => {
    const previous = flights.get(task.id);
    const next = cast.enqueue(
      id,
      async () => {
        await previous;
        await action();
      },
      interrupt,
    );
    flights.set(task.id, next);
  };
  const team = (task: Task) => task.recruit?.joined ?? [];
  const alert = async (id: string) => {
    characters.get(id)?.bubble.show("!", ALERT_MS);
    await new Promise((resolve) => setTimeout(resolve, ALERT_MS));
  };
  const perform: { [K in Intent["kind"]]: (intent: Extract<Intent, { kind: K }>) => void } = {
    create: (intent) => {
      const { task } = intent;
      const from = task.publisherId === "human" ? places.counter : undefined;
      flights.set(task.id, cards.toBoard(task, from, true));
    },
    assigned: (intent) => {
      void cast.enqueue(intent.agentId, () => alert(intent.agentId), false);
    },
    claim: (intent) => {
      const { agentId, task } = intent;
      taskAction(task, agentId, async () => {
        await alert(agentId);
        await cast.walk(agentId, places.board, WALK_SPEED * RUN_MULTIPLIER);
        const character = characters.get(agentId);
        if (!character) return;
        await cards.fly(task, { x: character.x + 20, y: character.y - 48 });
        cards.carry(task, character);
        playSound("claim");
        await home(agentId, "typing");
        placeCard(task, agentId);
      });
    },
    report: (intent) => {
      void cast.enqueue(
        intent.agentId,
        () => characters.get(intent.agentId)?.bubble.show(intent.message, 4000),
        false,
      );
    },
    handoff: (intent) => {
      const { task, agentId, to } = intent;
      taskAction(task, agentId, async () => {
        const character = characters.get(agentId);
        if (!character) return;
        cards.carry(task, character);
        if (to) {
          const seat = cast.seats.get(to);
          if (seat) {
            const point = departure(seat, stage.layout);
            if (point) await cast.walk(agentId, cellCenter({ ...point, facing: seat.facing }));
          }
          playSound("handoff");
          const target = cast.desk(to) ?? characters.get(to)?.position;
          if (target) await cards.fly(task, target);
          placeCard(task, to);
        } else {
          playSound("handoff");
          await cards.toBoard(task, { x: character.x, y: character.y - 48 });
        }
        await home(agentId, "sit");
      });
    },
    complete: (intent) => {
      const { task, agentId } = intent;
      taskAction(
        task,
        agentId,
        async () => {
          const character = characters.get(agentId);
          if (!character) return;
          cast.settle(agentId, "sit");
          character.bubble.show("✓", 4000);
          playSound("complete");
          await Promise.all([
            confetti(stage, character.position),
            cards.fly(task, places.doneTray),
          ]);
          cards.remove(task.id);
          flights.delete(task.id);
        },
        false,
      );
    },
    pause: (intent) => {
      const { agentId, task } = intent;
      const index = [...cast.present].indexOf(agentId) % places.coffee.length;
      const spot = places.coffee[index];
      if (spot)
        void cast.enqueue(agentId, async () => {
          const character = characters.get(agentId);
          if (character) cards.carry(task, character);
          await cast.walk(agentId, spot);
          characters.get(agentId)?.setState("coffee");
        });
    },
    resume: (intent) => {
      void cast.enqueue(intent.agentId, async () => {
        await home(intent.agentId, "typing");
        placeCard(intent.task, intent.agentId);
      });
    },
    return: (intent) => {
      taskAction(
        intent.task,
        intent.agentId,
        async () => {
          const card = cards.get(intent.task);
          await cards.toBoard(intent.task, cards.position(card));
          cast.settle(intent.agentId, "sit");
        },
        false,
      );
    },
    meeting: (intent) => {
      const task = intent.task;
      const previous = flights.get(task.id);
      const arrivals = team(task).map((id, index) =>
        cast.enqueue(id, async () => {
          await previous;
          const seat = places.meeting[index];
          if (!seat) return;
          await cast.walk(id, seat);
          characters.get(id)?.setState("talk");
        }),
      );
      flights.set(
        task.id,
        Promise.all(arrivals).then(() => cards.place(task, places.meetingDesk)),
      );
    },
    disband: (intent) => {
      for (const id of team(intent.task)) void cast.enqueue(id, () => home(id, "sit"));
    },
    cancel: (intent) => {
      void (flights.get(intent.task.id) ?? Promise.resolve()).then(() =>
        cards.remove(intent.task.id),
      );
      const id = intent.task.assigneeId;
      if (id) void cast.enqueue(id, () => home(id, "sit"));
    },
    relay: relayAction(cast),
  };
  return Object.fromEntries(
    Object.entries(intentions).map(([type, plan]) => [
      type,
      async (event: ActionEvent) => {
        for (const intent of plan({ event, task: event.task, previous: event.previous }))
          perform[intent.kind](intent as never);
        await Promise.all([...flights.values(), queue.drain()]);
      },
    ]),
  ) as Record<string, (event: ActionEvent) => Promise<void>>;
}
