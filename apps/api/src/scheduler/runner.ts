import { Cron } from "croner";
import { expireLeases } from "../core/tasks/lease.ts";

export function startScheduler(): () => void {
  const job = new Cron("* * * * *", () => {
    expireLeases(new Date());
  });
  return () => job.stop();
}
