import { scheduleSchema } from "@idesk/shared/schedule-schemas";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { config } from "../config.ts";
import { db } from "../db/client.ts";
import { schedules } from "../db/schema.ts";
import { stopSchedules } from "../scheduler/schedules.ts";
import { app } from "./app.ts";

migrate(db, { migrationsFolder: new URL("../../drizzle", import.meta.url).pathname });
let cookie: string;
beforeEach(async () => {
  db.delete(schedules).run();
  const response = await app.request("/api/v1/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ password: "test" }),
  });
  cookie = (response.headers.get("Set-Cookie") as string).split(";")[0] as string;
});
afterEach(() => {
  stopSchedules();
  db.delete(schedules).run();
});
function request(path: string, method = "GET", body?: object, key?: string) {
  return app.request(`/api/v1/schedules${path}`, {
    method,
    headers: {
      ...(key ? { Authorization: `Bearer ${key}` } : { Cookie: cookie }),
      "Content-Type": "application/json",
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
}
const input = {
  name: "Publish",
  cron: "* * * * *",
  action: { type: "publish_task", template: { title: "REST schedule" } },
};

test("busy requests return 409 and viewers can only read execution history", async () => {
  const row = scheduleSchema.parse(
    await (
      await request("", "POST", {
        ...input,
        enabled: false,
        action: { type: "http", url: "https://example.test/secret", method: "GET" },
      })
    ).json(),
  );
  let finish!: (value: Response) => void;
  let entered!: () => void;
  const started = new Promise<void>((resolve) => {
    entered = resolve;
  });
  vi.stubGlobal(
    "fetch",
    vi.fn(() => {
      entered();
      return new Promise<Response>((resolve) => {
        finish = resolve;
      });
    }),
  );
  const originalPassword = config.IDESK_VIEWER_PASSWORD;
  try {
    const pending = request(`/${row.id}/run`, "POST");
    await started;
    const busy = await request(`/${row.id}/run`, "POST");
    expect(busy.status).toBe(409);
    expect(await busy.json()).toEqual({ error: "定时任务正在执行" });
    expect(await (await request(`/${row.id}`)).json()).toMatchObject({ running: true });
    finish(new Response());
    expect(await (await pending).json()).toMatchObject({
      running: false,
      action: { url: "••••••" },
    });
    config.IDESK_VIEWER_PASSWORD = "schedule-viewer";
    const login = await app.request("/api/v1/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: "schedule-viewer" }),
    });
    cookie = (login.headers.get("Set-Cookie") as string).split(";")[0] as string;
    const history = await request(`/${row.id}/events`);
    expect(history.status).toBe(200);
    const body = await history.json();
    expect(body).toHaveLength(2);
    expect(JSON.stringify(body)).not.toContain("example.test");
    for (const [path, method, data] of [
      [`/${row.id}/run`, "POST"],
      [`/${row.id}`, "PATCH", { enabled: true }],
      [`/${row.id}`, "DELETE"],
      ["", "POST", input],
    ] as const) {
      expect((await request(path, method, data)).status).toBe(403);
    }
  } finally {
    config.IDESK_VIEWER_PASSWORD = originalPassword;
    vi.unstubAllGlobals();
  }
});
