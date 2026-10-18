import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { expect, test } from "vitest";

test("corrects only DolphinScheduler run dates once when upgrading from 0007", () => {
  const dir = mkdtempSync(join(tmpdir(), "idesk-ds-timezone-"));
  const sqlite = new Database(":memory:");
  try {
    const migrationsFolder = new URL("../../drizzle", import.meta.url).pathname;
    const journal = JSON.parse(
      readFileSync(join(migrationsFolder, "meta/_journal.json"), "utf8"),
    ) as { entries: { tag: string; idx: number }[] };
    const oldFolder = join(dir, "old-migrations");
    mkdirSync(join(oldFolder, "meta"), { recursive: true });
    const oldEntries = journal.entries.filter((entry) => entry.idx < 8);
    for (const entry of oldEntries)
      copyFileSync(join(migrationsFolder, `${entry.tag}.sql`), join(oldFolder, `${entry.tag}.sql`));
    writeFileSync(
      join(oldFolder, "meta/_journal.json"),
      JSON.stringify({ ...journal, entries: oldEntries }),
    );
    const database = drizzle(sqlite);
    migrate(database, { migrationsFolder: oldFolder });
    const started = Date.parse("2026-10-14T01:35:00Z");
    const finished = started + 60_000;
    for (const plugin of ["dolphinscheduler", "n8n"]) {
      sqlite
        .prepare("INSERT INTO connectors (id, plugin_id, name, config) VALUES (?, ?, ?, '{}')")
        .run(plugin, plugin, plugin);
      sqlite
        .prepare(
          "INSERT INTO automation_jobs (id, connector_id, external_id, name) VALUES (?, ?, '1', 'Job')",
        )
        .run(plugin, plugin);
      const insert = sqlite.prepare(
        "INSERT INTO automation_runs (id, job_id, external_id, status, started_at, finished_at) VALUES (?, ?, ?, 'success', ?, ?)",
      );
      insert.run(`${plugin}-done`, plugin, "done", started, finished);
      insert.run(`${plugin}-active`, plugin, "active", started, null);
      insert.run(`${plugin}-pending`, plugin, "pending", null, null);
    }
    const read = () =>
      sqlite.prepare("SELECT id, started_at, finished_at FROM automation_runs ORDER BY id").all();
    migrate(database, { migrationsFolder });
    const expected = ["dolphinscheduler", "n8n"].flatMap((plugin) => {
      const shift = plugin === "dolphinscheduler" ? 28_800_000 : 0;
      return [
        { id: `${plugin}-active`, started_at: started - shift, finished_at: null },
        { id: `${plugin}-done`, started_at: started - shift, finished_at: finished - shift },
        { id: `${plugin}-pending`, started_at: null, finished_at: null },
      ];
    });
    expect(read()).toEqual(expected);
    migrate(database, { migrationsFolder });
    expect(read()).toEqual(expected);
  } finally {
    sqlite.close();
    rmSync(dir, { recursive: true, force: true });
  }
});
