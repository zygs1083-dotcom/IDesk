import { appendFileSync } from "node:fs";
import { join } from "node:path";
import { asc, inArray, lt } from "drizzle-orm";
import { z } from "zod";
import { events } from "../../apps/api/src/db/schema.ts";
import type { Plugin, PluginContext } from "../../apps/api/src/plugins/types.ts";

const configSchema = z.object({
  keepDays: z
    .number()
    .int()
    .min(1)
    .default(90)
    .meta({ title: "保留天数", titleEn: "Retention days" }),
});
type Config = z.infer<typeof configSchema>;

export async function archive(ctx: PluginContext, config: Config, now: Date): Promise<void> {
  const cutoff = new Date(now.getTime() - config.keepDays * 86_400_000);
  let count = 0;
  for (;;) {
    const batch = ctx.db
      .select()
      .from(events)
      .where(lt(events.ts, cutoff))
      .orderBy(asc(events.ts), asc(events.id))
      .limit(1000)
      .all();
    if (batch.length === 0) break;
    const months = new Map<string, string[]>();
    for (const event of batch) {
      const ts = event.ts.toISOString();
      const month = ts.slice(0, 7);
      const lines = months.get(month) ?? [];
      lines.push(JSON.stringify({ ...event, ts }));
      months.set(month, lines);
    }
    for (const [month, lines] of months) {
      appendFileSync(join(ctx.dataDir, `events-${month}.jsonl`), `${lines.join("\n")}\n`);
    }
    ctx.db
      .delete(events)
      .where(
        inArray(
          events.id,
          batch.map((event) => event.id),
        ),
      )
      .run();
    count += batch.length;
  }
  if (count > 0) ctx.events.emit({ type: "archive.events", payload: { count } });
}

export default {
  id: "event-archive",
  name: "Event archive",
  version: "0.1.0",
  kind: "action",
  enabledByDefault: false,
  configSchema,
  setup(ctx) {
    const config = ctx.config as Config;
    ctx.schedule("0 3 * * *", () => archive(ctx, config, new Date()));
  },
} satisfies Plugin;
