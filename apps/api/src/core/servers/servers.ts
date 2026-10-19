import { createHash, randomBytes } from "node:crypto";
import {
  SERVER_RANGE_SECONDS,
  SERVER_RETENTION_DAYS,
  SERVER_SAMPLE_SECONDS,
  type serverSampleInputSchema,
} from "@idesk/shared/server-schemas";
import { and, asc, eq, lt, sql } from "drizzle-orm";
import type { z } from "zod";
import { db } from "../../db/client.ts";
import { serverSamples, servers } from "../../db/schema.ts";

type Server = typeof servers.$inferSelect;
type Sample = z.infer<typeof serverSampleInputSchema>;
type Range = keyof typeof SERVER_RANGE_SECONDS;

function toPublic(row: Server, now: Date) {
  const { tokenHash, ...server } = row;
  return {
    ...server,
    status:
      row.lastSeenAt !== null &&
      now.getTime() - row.lastSeenAt.getTime() <= SERVER_SAMPLE_SECONDS * 3000
        ? ("online" as const)
        : ("offline" as const),
  };
}

function newToken() {
  const token = `ids_${randomBytes(32).toString("base64url")}`;
  return { token, tokenHash: createHash("sha256").update(token).digest("hex") };
}

export function listServers() {
  const now = new Date();
  return db
    .select()
    .from(servers)
    .orderBy(asc(servers.createdAt), asc(servers.id))
    .all()
    .map((row) => toPublic(row, now));
}

export function createServer(name: string) {
  const { token, tokenHash } = newToken();
  const server = db.insert(servers).values({ name, tokenHash }).returning().get();
  return { server: toPublic(server, new Date()), token };
}

export function renameServer(id: string, name: string) {
  const server = db.update(servers).set({ name }).where(eq(servers.id, id)).returning().get();
  return server && toPublic(server, new Date());
}

export function rotateServerToken(id: string) {
  const { token, tokenHash } = newToken();
  const server = db.update(servers).set({ tokenHash }).where(eq(servers.id, id)).returning().get();
  return server && { server: toPublic(server, new Date()), token };
}

export function deleteServer(id: string) {
  return db.transaction((tx) => {
    const server = tx.delete(servers).where(eq(servers.id, id)).returning().get();
    if (server) tx.delete(serverSamples).where(eq(serverSamples.serverId, id)).run();
    return server !== undefined;
  });
}

export function recordSample(token: string, sample: Sample): boolean {
  const hash = createHash("sha256").update(token).digest("hex");
  const now = new Date();
  return db.transaction((tx) => {
    const server = tx
      .update(servers)
      .set({ info: sample.info, lastSeenAt: now })
      .where(eq(servers.tokenHash, hash))
      .returning({ id: servers.id })
      .get();
    if (!server) return false;
    const diskUsed = sample.disks.reduce((sum, disk) => sum + disk.used, 0);
    const diskTotal = sample.disks.reduce((sum, disk) => sum + disk.total, 0);
    tx.insert(serverSamples)
      .values({
        serverId: server.id,
        ts: now,
        cpu: sample.cpu,
        cores: sample.cores,
        load1: sample.load[0],
        load5: sample.load[1],
        load15: sample.load[2],
        memUsed: sample.memUsed,
        memTotal: sample.memTotal,
        swapUsed: sample.swapUsed,
        swapTotal: sample.swapTotal,
        diskUsed,
        diskTotal,
        disks: sample.disks,
        netRx: sample.netRx,
        netTx: sample.netTx,
        uptime: sample.uptime,
      })
      .run();
    return true;
  });
}

export function serverMetrics(id: string, range: Range) {
  if (!db.select({ id: servers.id }).from(servers).where(eq(servers.id, id)).get())
    return undefined;
  const now = Date.now();
  const seconds = SERVER_RANGE_SECONDS[range];
  const step = Math.max(SERVER_SAMPLE_SECONDS, Math.ceil(seconds / 360));
  const bucket = sql<number>`cast(${serverSamples.ts} / ${step * 1000} as integer)`;
  const rows = db
    .select({
      bucket,
      cpu: sql<number>`avg(${serverSamples.cpu})`,
      load1: sql<number>`avg(${serverSamples.load1})`,
      memUsed: sql<number>`avg(${serverSamples.memUsed})`,
      swapUsed: sql<number>`avg(${serverSamples.swapUsed})`,
      diskUsed: sql<number>`avg(${serverSamples.diskUsed})`,
      netRx: sql<number>`avg(${serverSamples.netRx})`,
      netTx: sql<number>`avg(${serverSamples.netTx})`,
    })
    .from(serverSamples)
    .where(and(eq(serverSamples.serverId, id), sql`${serverSamples.ts} >= ${now - seconds * 1000}`))
    .groupBy(bucket)
    .orderBy(bucket)
    .all();
  const latest = db
    .select()
    .from(serverSamples)
    .where(eq(serverSamples.serverId, id))
    .orderBy(sql`${serverSamples.ts} desc`, sql`${serverSamples.id} desc`)
    .limit(1)
    .get();
  return {
    range,
    step,
    points: rows.map(({ bucket, ...point }) => ({
      ts: new Date(bucket * step * 1000).toISOString(),
      ...point,
    })),
    latest: latest
      ? {
          ts: latest.ts.toISOString(),
          cpu: latest.cpu,
          cores: latest.cores,
          load: [latest.load1, latest.load5, latest.load15] as [number, number, number],
          memUsed: latest.memUsed,
          memTotal: latest.memTotal,
          swapUsed: latest.swapUsed,
          swapTotal: latest.swapTotal,
          disks: latest.disks,
          netRx: latest.netRx,
          netTx: latest.netTx,
          uptime: latest.uptime,
        }
      : null,
  };
}

export function pruneServerSamples(now: Date) {
  db.delete(serverSamples)
    .where(lt(serverSamples.ts, new Date(now.getTime() - SERVER_RETENTION_DAYS * 86_400_000)))
    .run();
}
