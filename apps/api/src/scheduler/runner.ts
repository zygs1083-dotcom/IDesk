import { Cron } from "croner";
import { expireLeases } from "../core/tasks/lease.ts";
import { pollDueConnectors } from "../plugins/poll.ts";

export function startScheduler(): () => void {
  const job = new Cron("* * * * *", () => {
    expireLeases(new Date());
    void pollDueConnectors(new Date());
  });
  return () => job.stop();
}
