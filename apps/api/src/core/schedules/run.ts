import type { ScheduleAction } from "@idesk/shared/schedule-schemas";
import { eq } from "drizzle-orm";
import { db } from "../../db/client.ts";
import { connectors, schedules } from "../../db/schema.ts";
import { connectorPlugin } from "../../plugins/registry.ts";
import { emitEvent } from "../events/bus.ts";
import { createTask } from "../tasks/store.ts";
import { getSchedule, nextScheduleRun, type Schedule } from "./schedules.ts";

type RunResult = { status: "success" } | { status: "failed"; error: string };
const executions: {
  [Type in ScheduleAction["type"]]: (
    action: Extract<ScheduleAction, { type: Type }>,
  ) => Promise<RunResult>;
} = {
  async publish_task(action) {
    createTask(action.template, "human");
    return { status: "success" };
  },
  async connector_trigger(action) {
    const connector = db
      .select()
      .from(connectors)
      .where(eq(connectors.id, action.connectorId))
      .get();
    if (!connector?.enabled) return { status: "failed", error: "连接器不可用" };
    const plugin = connectorPlugin(connector.pluginId);
    if (!plugin) return { status: "failed", error: "连接器不可用" };
    if (!plugin.trigger) return { status: "failed", error: "该连接器不支持触发" };
    const config = plugin.configSchema.parse(connector.config);
    await plugin.trigger(config, action.jobExternalId, action.params);
    return { status: "success" };
  },
  async http(action) {
    const response = await fetch(action.url, {
      method: action.method,
      headers: action.headers,
      ...(action.body === undefined ? {} : { body: action.body }),
    });
    return response.ok
      ? { status: "success" }
      : { status: "failed", error: `HTTP ${response.status}` };
  },
};

export async function runSchedule(id: string): Promise<Schedule | undefined> {
  const row = getSchedule(id);
  if (!row) return undefined;
  let result: RunResult;
  try {
    // 同一 type 下 action 与执行函数一一对应，断言只为让 TS 认可。
    const execute = executions[row.action.type] as (action: ScheduleAction) => Promise<RunResult>;
    result = await execute(row.action);
  } catch (error) {
    result = { status: "failed", error: error instanceof Error ? error.message : String(error) };
  }
  const updated = db
    .update(schedules)
    .set({
      lastRunAt: new Date(),
      lastStatus: result.status,
      nextRunAt: nextScheduleRun(row),
    })
    .where(eq(schedules.id, id))
    .returning()
    .get();
  emitEvent({ type: "schedule.fired", payload: { scheduleId: id, ...result } });
  return updated;
}
