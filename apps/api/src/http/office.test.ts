import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, test, vi } from "vitest";

test("office metadata, optional hosting, SPA fallback and runtime scene override", async () => {
  const directory = mkdtempSync(join(tmpdir(), "idesk-office-"));
  const dist = join(directory, "dist");
  const data = join(directory, "data");
  mkdirSync(dist);
  mkdirSync(join(data, "office"), { recursive: true });
  writeFileSync(join(dist, "index.html"), "office canvas");
  writeFileSync(join(dist, "scene.json"), '{"hostZones":{}}');
  writeFileSync(join(dist, "asset.js"), "office asset");
  vi.stubEnv("IDESK_OFFICE_DIST", undefined);
  vi.stubEnv("IDESK_WEB_DIST", dist);
  vi.resetModules();
  const disabled = (await import("./app.ts")).app;
  expect(await (await disabled.request("/api/meta")).json()).toEqual({
    office: false,
    build: null,
  });
  expect((await disabled.request("/office/")).status).toBe(404);
  expect((await disabled.request("/office/scene.json")).status).toBe(404);

  vi.stubEnv("IDESK_OFFICE_DIST", dist);
  vi.stubEnv("IDESK_DATA_DIR", data);
  vi.resetModules();
  const enabled = (await import("./app.ts")).app;
  expect(await (await enabled.request("/api/meta")).json()).toEqual({
    office: true,
    build: expect.stringMatching(/^[0-9a-f]{8}$/),
  });
  expect(await (await enabled.request("/office/")).text()).toBe("office canvas");
  expect(await (await enabled.request("/office/room")).text()).toBe("office canvas");
  expect(await (await enabled.request("/office/asset.js")).text()).toBe("office asset");
  expect(await (await enabled.request("/office/scene.json")).json()).toEqual({ hostZones: {} });
  writeFileSync(join(data, "office", "scene.json"), '{"hostZones":{"test":2}}');
  expect(await (await enabled.request("/office/scene.json")).json()).toEqual({
    hostZones: { test: 2 },
  });
  vi.unstubAllEnvs();
  rmSync(directory, { recursive: true });
});
