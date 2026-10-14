import { Cron } from "croner";
import { expireLeases } from "../tasks/service.js";

/** Every minute: in_progress tasks whose owner stopped heartbeating go back to open. */
export function startLeaseSweeper(): Cron {
  return new Cron("* * * * *", { protect: true }, () => {
    try {
      const ids = expireLeases();
      if (ids.length) console.log(`[sweeper] released ${ids.length} task(s) with expired lease`);
    } catch (err) {
      console.error("[sweeper] failed", err);
    }
  });
}
