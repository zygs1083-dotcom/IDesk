import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { expect, test } from "vitest";

test("upgrades an existing database without treating a failed attempt as a successful cursor", () => {
  const dir = mkdtempSync(join(tmpdir(), "idesk-connector-migration-"));
  const sqlite = new Database(join(dir, "old.db"));
  try {
    const migrationsFolder = new URL("../../drizzle", import.meta.url).pathname;
    const journal = JSON.parse(
      readFileSync(join(migrationsFolder, "meta/_journal.json"), "utf8"),
    ) as { entries: { tag: string; idx: number }[] };
    const oldFolder = join(dir, "old-migrations");
    mkdirSync(join(oldFolder, "meta"), { recursive: true });
    const oldEntries = journal.entries.filter((entry) => entry.idx < 6);
    for (const entry of oldEntries)
      copyFileSync(join(migrationsFolder, `${entry.tag}.sql`), join(oldFolder, `${entry.tag}.sql`));
    writeFileSync(
      join(oldFolder, "meta/_journal.json"),
      JSON.stringify({ ...journal, entries: oldEntries }),
    );
    const database = drizzle(sqlite);
    migrate(database, { migrationsFolder: oldFolder });
    sqlite
      .prepare(
        "INSERT INTO connectors (id, plugin_id, name, config, last_polled_at, last_error) VALUES (?, ?, ?, ?, ?, ?)",
      )
      .run("old", "n8n", "Old", "{}", 1000, "failed");
    migrate(database, { migrationsFolder });
    expect(
      sqlite.prepare("SELECT last_polled_at, last_succeeded_at, last_error FROM connectors").get(),
    ).toEqual({ last_polled_at: 1000, last_succeeded_at: null, last_error: "failed" });
    const fresh = new Database(":memory:");
    try {
      migrate(drizzle(fresh), { migrationsFolder });
      expect(fresh.prepare("PRAGMA table_info(connectors)").all()).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ name: "last_succeeded_at", notnull: 0 }),
        ]),
      );
    } finally {
      fresh.close();
    }
  } finally {
    sqlite.close();
    rmSync(dir, { recursive: true, force: true });
  }
});
