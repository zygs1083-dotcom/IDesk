import { publicAgentSchema } from "@idesk/shared/agent-schemas";
import { eventSchema, taskSchema } from "@idesk/shared/task-schemas";
import { z } from "zod";
import type { Translate } from "../i18n/translate.ts";
import { request } from "../lib/api.ts";
import { onRealtimeEvent } from "../lib/realtime.ts";
import { Cards } from "../stage/card.ts";
import { createDaylight } from "../stage/daylight.ts";
import type { Stage } from "../world/stage.ts";
import { createActions } from "./actions.ts";
import { Cast } from "./cast.ts";
import { eventPull } from "./events.ts";
import { startIdle } from "./idle.ts";
import { placeSnapshot } from "./snapshot.ts";

const PRESENCE_MS = 30_000;
const LEASE_WARNING_MS = 120_000;

export async function direct(stage: Stage, t: Translate) {
  const initialEvents = z.array(eventSchema).parse(await request("/events"));
  const initialized = await initialize(stage, t);
  if (!initialized) return;
  const { cast, snapshot, actions, tasks, cards } = initialized;
  placeSnapshot(cast, cards, tasks);
  const syncIdle = startIdle(cast, snapshot, t);
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
        syncIdle();
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
  const unsubscribe = onRealtimeEvent(
    () => void pull(),
    () => void pull(),
  );
  const timer = setInterval(async () => {
    const agents = z.array(publicAgentSchema).parse(await request("/agents"));
    if (stage.world.destroyed) return;
    cast.update(agents);
    syncIdle();
    checkLeases();
  }, PRESENCE_MS);
  checkLeases();
  stage.world.on("destroyed", () => {
    clearInterval(timer);
    unsubscribe();
  });
  await pull();
  return cast;
}

export async function initialize(stage: Stage, t: Translate) {
  const [agents, tasks] = await Promise.all([
    request("/agents").then((data) => z.array(publicAgentSchema).parse(data)),
    request("/tasks").then((data) => z.array(taskSchema).parse(data)),
  ]);
  if (stage.world.destroyed) return;
  const cast = new Cast(stage, stage.assets.sprites, t("reception.name"));
  createDaylight(stage, cast.characters);
  cast.update(agents, true);
  const cards = new Cards(stage);
  const snapshot = new Map(tasks.map((task) => [task.id, task]));
  const actions = createActions(cast, cards);
  return { cast, cards, snapshot, actions, tasks };
}
