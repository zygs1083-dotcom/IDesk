import { playSound } from "../engine/sound.ts";
import type { Cards } from "../stage/card.ts";
import { confetti, envelope } from "../stage/effects.ts";
import type { Cast } from "./cast.ts";
import type { OfficeEvent, Task } from "./events.ts";
import { type Intent, intentions } from "./intents.ts";

type ActionEvent = OfficeEvent & { task: Task | undefined; previous: Task | undefined };

export function createActions(cast: Cast, cards: Cards) {
  const { stage, scene, queue, characters } = cast;
  const meetingPoint = {
    x: scene.meeting.seats.reduce((sum, seat) => sum + seat.x, 0) / scene.meeting.seats.length,
    y: scene.meeting.seats.reduce((sum, seat) => sum + seat.y, 0) / scene.meeting.seats.length,
  };
  const home = async (id: string, state: "idle" | "typing") => {
    const seat = cast.seats.get(id);
    if (!seat) return;
    await cast.walk(id, seat);
    cast.settle(id, state);
  };
  const flights = new Map<string, Promise<void>>();
  const taskAction = (task: Task, id: string, action: () => Promise<void>) => {
    const previous = flights.get(task.id);
    const next = queue.enqueue(id, async () => {
      await previous;
      await action();
    });
    flights.set(task.id, next);
  };
  const team = (task: Task) => task.recruit?.joined ?? [];
  const perform: { [K in Intent["kind"]]: (intent: Extract<Intent, { kind: K }>) => void } = {
    create: (intent) => {
      const { task } = intent;
      const from = task.publisherId === "human" ? cast.desk("human") : undefined;
      flights.set(task.id, cards.toBoard(task, from, true));
    },
    claim: (intent) => {
      const { agentId, task } = intent;
      taskAction(task, agentId, async () => {
        const board = scene.waypoints.find((point) => point.id === "board");
        if (!board) return;
        await cast.walk(agentId, { ...board, via: board.id, facing: "up" });
        const character = characters.get(agentId);
        if (!character) return;
        await cards.fly(task, { x: character.x + 20, y: character.y - 48 });
        cards.carry(task, character);
        playSound("claim");
        await home(agentId, "typing");
        cards.place(task, cast.desk(agentId));
      });
    },
    report: (intent) => {
      void queue.enqueue(intent.agentId, () =>
        characters.get(intent.agentId)?.bubble.show(intent.message, 4000),
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
            const waypoint = scene.waypoints.find((point) => point.id === seat.via);
            if (waypoint)
              await cast.walk(agentId, { ...waypoint, via: waypoint.id, facing: seat.facing });
          }
          playSound("handoff");
          await cards.fly(task, cast.desk(to));
        } else {
          playSound("handoff");
          await cards.toBoard(task, { x: character.x, y: character.y - 48 });
        }
        await home(agentId, "idle");
      });
    },
    complete: (intent) => {
      const { task, agentId } = intent;
      taskAction(task, agentId, async () => {
        const character = characters.get(agentId);
        if (!character) return;
        character.setState("idle");
        character.bubble.show("✓", 4000);
        playSound("complete");
        await Promise.all([confetti(stage, character.position), cards.fly(task, scene.doneTray)]);
        cards.remove(task.id);
        flights.delete(task.id);
      });
    },
    pause: (intent) => {
      const { agentId } = intent;
      const index = [...cast.present].indexOf(agentId) % scene.lounge.spots.length;
      const spot = scene.lounge.spots[index];
      if (spot)
        void queue.enqueue(agentId, async () => {
          await cast.walk(agentId, spot);
          characters.get(agentId)?.setState("coffee");
        });
    },
    resume: (intent) => {
      void queue.enqueue(intent.agentId, () => home(intent.agentId, "typing"));
    },
    return: (intent) => {
      taskAction(intent.task, intent.agentId, async () => {
        const card = cards.get(intent.task);
        await cards.toBoard(intent.task, cards.position(card));
        characters.get(intent.agentId)?.setState("idle");
      });
    },
    meeting: (intent) => {
      const task = intent.task;
      const previous = flights.get(task.id);
      const arrivals = team(task).map((id, index) =>
        queue.enqueue(id, async () => {
          await previous;
          const seat = scene.meeting.seats[index];
          if (!seat) return;
          await cast.walk(id, seat);
          characters.get(id)?.setState("talk");
        }),
      );
      flights.set(
        task.id,
        Promise.all(arrivals).then(() => cards.place(task, meetingPoint)),
      );
    },
    disband: (intent) => {
      for (const id of team(intent.task)) void queue.enqueue(id, () => home(id, "idle"));
    },
    cancel: (intent) => {
      void (flights.get(intent.task.id) ?? Promise.resolve()).then(() =>
        cards.remove(intent.task.id),
      );
      const id = intent.task.assigneeId;
      if (id) void queue.enqueue(id, () => home(id, "idle"));
    },
    relay: (intent) => {
      const { agentId, to } = intent;
      const recipients =
        to.kind === "agent"
          ? [to.id]
          : to.kind === "capability"
            ? [...cast.present].filter((id) => cast.agents.get(id)?.capabilities.includes(to.value))
            : [];
      void queue.enqueue(agentId, async () => {
        const from = characters.get(agentId)?.position ?? scene.frontDesk.human;
        if (to.kind === "broadcast") {
          await envelope(stage, from, scene.bulletin);
          playSound("envelope");
        } else
          await Promise.all(
            recipients.map(async (id) => {
              await envelope(stage, from, cast.desk(id));
              playSound("envelope");
              void queue.enqueue(id, async () => {
                const character = characters.get(id);
                if (!character) return;
                const facing = character.facing;
                character.facing = "down";
                await new Promise((resolve) => setTimeout(resolve, 1000));
                character.facing = facing;
              });
            }),
          );
      });
    },
  };
  return Object.fromEntries(
    Object.entries(intentions).map(([type, plan]) => [
      type,
      (event: ActionEvent) => {
        for (const intent of plan({ event, task: event.task, previous: event.previous }))
          perform[intent.kind](intent as never);
      },
    ]),
  ) as Record<string, (event: ActionEvent) => void>;
}
