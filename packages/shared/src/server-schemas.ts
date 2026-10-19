import { z } from "zod";

export const SERVER_RANGES = ["1h", "6h", "24h", "7d"] as const;
export const SERVER_RANGE_SECONDS: Record<(typeof SERVER_RANGES)[number], number> = {
  "1h": 3600,
  "6h": 21_600,
  "24h": 86_400,
  "7d": 604_800,
};
/** 采集进程每隔这么多秒上报一次；超过 3 个间隔没有上报算离线 */
export const SERVER_SAMPLE_SECONDS = 10;
export const SERVER_RETENTION_DAYS = 7;

const percent = z.number().min(0).max(100);
const bytes = z.number().int().nonnegative();

export const serverInfoSchema = z.object({
  hostname: z.string(),
  os: z.string(),
  kernel: z.string(),
  cpuModel: z.string(),
  cpuCount: z.number().int().positive(),
});
export const serverDiskSchema = z.object({ mount: z.string(), used: bytes, total: bytes });

/** 采集进程 POST /api/probe/v1/samples 的请求体，时间以服务端收到时为准 */
export const serverSampleInputSchema = z.object({
  info: serverInfoSchema,
  cpu: percent,
  cores: z.array(percent),
  load: z.tuple([z.number(), z.number(), z.number()]),
  memUsed: bytes,
  memTotal: bytes,
  swapUsed: bytes,
  swapTotal: bytes,
  disks: z.array(serverDiskSchema),
  /** 每秒字节数，所有非 lo 网卡之和 */
  netRx: z.number().nonnegative(),
  netTx: z.number().nonnegative(),
  uptime: z.number().nonnegative(),
});

export const createServerSchema = z.object({ name: z.string().trim().min(1).max(40) });
export const patchServerSchema = createServerSchema;

export const publicServerSchema = z
  .object({
    id: z.string(),
    name: z.string(),
    info: serverInfoSchema.nullable(),
    lastSeenAt: z.iso.datetime().nullable(),
    createdAt: z.iso.datetime(),
    status: z.enum(["online", "offline"]),
  })
  .meta({ id: "PublicServer" });
export const createdServerSchema = z.object({ server: publicServerSchema, token: z.string() });

export const serverMetricsQuerySchema = z.object({ range: z.enum(SERVER_RANGES).default("1h") });
/** 一个时间桶内的平均值；桶内没有样本的时间段不出点，前端据此断线 */
export const serverPointSchema = z.object({
  ts: z.iso.datetime(),
  cpu: z.number(),
  load1: z.number(),
  memUsed: z.number(),
  swapUsed: z.number(),
  diskUsed: z.number(),
  netRx: z.number(),
  netTx: z.number(),
});
export const serverMetricsSchema = z
  .object({
    range: z.enum(SERVER_RANGES),
    /** 桶宽（秒） */
    step: z.number().int().positive(),
    points: z.array(serverPointSchema),
    latest: serverSampleInputSchema
      .omit({ info: true })
      .extend({ ts: z.iso.datetime() })
      .nullable(),
  })
  .meta({ id: "ServerMetrics" });
