import { publicAgentSchema } from "@idesk/shared/agent-schemas";
import { eventSchema, taskSchema } from "@idesk/shared/task-schemas";
import { z } from "zod";
import { request } from "../lib/api.ts";
import { onRealtimeEvent } from "../lib/realtime.ts";
import type { Scene } from "../scene/scene.ts";
import { Cards } from "../stage/card.ts";
import { createDaylight } from "../stage/daylight.ts";
import type { Stage } from "../stage/stage.ts";
import { sprites } from "../stage/textures.ts";
import { createActions } from "./actions.ts";
import { Cast } from "./cast.ts";
import { eventPull } from "./events.ts";
import { placeSnapshot } from "./snapshot.ts";

const PRESENCE_MS = 30_000;
const LEASE_WARNING_MS = 120_000;

export async function direct(stage: Stage, scene: Scene, humanName: string) {
  const initialEvents = z.array(eventSchema).parse(await request("/events"));
  const initialized = await initialize(stage, scene, humanName);
  if (!initialized) return;
  const { cast, snapshot, actions, daylight, tasks, cards } = initialized;
  placeSnapshot(cast, cards, tasks);
  const warned = new Set<string>();
  const checkLeases = () => {
    const nearExpiry = new Set(
      [...snapshot.values()]
        .filter(
          (task) =>
            task.status === "in_progress" &&
            task.leaseExpiresAt !== null &&
            Date.parse(task.leaseExpiresAt) - Date.now() < LEASE_WARNING_MS,
        )
        .map((task) => task.assigneeId)
        .filter((id): id is string => id !== null),
    );
    for (const id of warned)
      if (!nearExpiry.has(id) || !cast.present.has(id)) {
        cast.characters.get(id)?.bubble.hide();
        warned.delete(id);
      }
    for (const id of nearExpiry) {
      if (!cast.present.has(id) || warned.has(id)) continue;
      warned.add(id);
      void cast.queue.enqueue(id, () => {
        if (warned.has(id)) cast.characters.get(id)?.bubble.show("zzz", Number.POSITIVE_INFINITY);
      });
    }
  };
  const pull = eventPull(
    initialEvents[0]?.id ?? "",
    async (since) => z.array(eventSchema).parse(await request(`/events?since=${since}`)),
    async (event) => {
      if (stage.world.destroyed) return;
      if (event.agentId) {
        if (!cast.agents.has(event.agentId))
          cast.update(z.array(publicAgentSchema).parse(await request("/agents")));
        cast.arrive(event.agentId);
      }
      const previous = event.taskId ? snapshot.get(event.taskId) : undefined;
      let task = previous;
      if (event.taskId && event.type.startsWith("task.")) {
        task = taskSchema.parse(await request(`/tasks/${event.taskId}`));
        snapshot.set(task.id, task);
      }
      actions[event.type]?.({ ...event, task, previous });
      checkLeases();
    },
  );
  const unsubscribe = onRealtimeEvent(() => void pull());
  const timer = setInterval(async () => {
    const agents = z.array(publicAgentSchema).parse(await request("/agents"));
    if (stage.world.destroyed) return;
    cast.update(agents);
    checkLeases();
  }, PRESENCE_MS);
  checkLeases();
  stage.world.on("destroyed", () => {
    clearInterval(timer);
    unsubscribe();
  });
  await pull();
  return daylight;
}

export async function initialize(stage: Stage, scene: Scene, humanName: string) {
  const [atlas, agents, tasks] = await Promise.all([
    sprites,
    request("/agents").then((data) => z.array(publicAgentSchema).parse(data)),
    request("/tasks").then((data) => z.array(taskSchema).parse(data)),
  ]);
  if (stage.world.destroyed) return;
  atlas.textureSource.scaleMode = "nearest";
  const cast = new Cast(stage, scene, atlas.textures, humanName);
  const daylight = createDaylight(stage, cast.characters);
  cast.update(agents, true);
  const cards = new Cards(stage, scene);
  const snapshot = new Map(tasks.map((task) => [task.id, task]));
  const actions = createActions(cast, cards);
  return { cast, cards, snapshot, actions, daylight, tasks };
}
