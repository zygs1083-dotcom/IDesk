import { Cron } from "croner";
import { expireLeases } from "../core/tasks/lease.ts";
import { pollDueConnectors } from "../plugins/poll.ts";

export function startScheduler(): () => void {
  const leases = new Cron("* * * * *", () => {
    expireLeases(new Date());
  });
  const job = new Cron("* * * * *", { protect: true }, async () => {
    await pollDueConnectors(new Date());
  });
  return () => {
    leases.stop();
    job.stop();
  };
}
