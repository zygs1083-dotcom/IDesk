import { eventSchema, taskSchema } from "@idesk/shared/task-schemas";
import { z } from "zod";
import { setTimeScale } from "../engine/tween.ts";
import { request } from "../lib/api.ts";
import type { Scene } from "../scene/scene.ts";
import type { Stage } from "../stage/stage.ts";
import { initialize } from "./director.ts";
import type { OfficeEvent } from "./events.ts";
import { ulidAt } from "./replay-time.ts";

export type ReplayControls = {
  start: number;
  end: number;
  playing: boolean;
  speed: number;
  update: (at: number, ended: boolean) => void;
};

export async function replay(stage: Stage, scene: Scene, at: number, controls: ReplayControls) {
  const initialized = await initialize(stage, scene);
  if (!initialized) return;
  const { cast, cards, snapshot, actions, daylight, tasks } = initialized;
  for (const id of cast.present) cast.settle(id, "idle");
  for (const task of tasks) if (task.status === "open") cards.pin(task);
  const events: OfficeEvent[] = [];
  let since = ulidAt(controls.start);
  while (true) {
    const page = z.array(eventSchema).parse(await request(`/events?since=${since}`));
    if (stage.world.destroyed) return;
    events.push(...page.filter((event) => Date.parse(event.ts) <= controls.end));
    if (page.length < 200) break;
    for (const event of page) since = event.id;
  }
  const missing = new Set(
    events.flatMap((event) => (event.taskId && !snapshot.has(event.taskId) ? [event.taskId] : [])),
  );
  await Promise.all(
    [...missing].map(async (id) => {
      const task = taskSchema.parse(await request(`/tasks/${id}`));
      snapshot.set(id, task);
    }),
  );
  if (stage.world.destroyed) return;
  events.sort((a, b) => Date.parse(a.ts) - Date.parse(b.ts));
  const feed = (event: OfficeEvent) => {
    if (event.agentId) cast.arrive(event.agentId);
    const task = event.taskId ? snapshot.get(event.taskId) : undefined;
    return actions[event.type]?.({ ...event, task, previous: task });
  };
  let index = 0;
  setTimeScale(Number.POSITIVE_INFINITY);
  for (const event of events) {
    if (Date.parse(event.ts) > at) break;
    await feed(event);
    index++;
    if (stage.world.destroyed) return;
  }
  setTimeScale(controls.speed);
  let current = at;
  controls.update(current, current === controls.end);
  const tick = ({ deltaMS }: { deltaMS: number }) => {
    setTimeScale(controls.speed);
    if (!controls.playing || current === controls.end) return;
    current = Math.min(controls.end, current + deltaMS * controls.speed);
    let event = events[index];
    while (event && Date.parse(event.ts) <= current) {
      void feed(event);
      event = events[++index];
    }
    controls.update(current, current === controls.end);
  };
  stage.app.ticker.add(tick);
  stage.world.on("destroyed", () => {
    stage.app.ticker.remove(tick);
    setTimeScale(1);
  });
  return daylight;
}
