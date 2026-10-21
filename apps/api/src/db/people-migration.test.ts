import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { expect, test } from "vitest";

const migrationsFolder = new URL("../../drizzle", import.meta.url).pathname;
const newTables = [
  "assistant_sessions",
  "assistant_settings",
  "people",
  "person_bindings",
  "task_origins",
];
test("0011 only creates the five designed tables/indexes and fresh databases enforce identities and singleton settings", () => {
  const sql = readFileSync(join(migrationsFolder, "0011_breezy_famine.sql"), "utf8");
  const statements = sql
    .split("--> statement-breakpoint")
    .map((s) => s.trim())
    .filter(Boolean);
  expect(statements.every((s) => /^CREATE (TABLE|UNIQUE INDEX)/.test(s))).toBe(true);
  expect(statements.filter((s) => s.startsWith("CREATE TABLE"))).toHaveLength(5);
  const sqlite = new Database(":memory:");
  try {
    sqlite.pragma("foreign_keys = ON");
    migrate(drizzle(sqlite), { migrationsFolder });
    for (const name of newTables)
      expect(
        sqlite.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name=?").get(name),
      ).toEqual({ name });
    sqlite.exec("INSERT INTO people VALUES ('p_one','Name','member',1)");
    expect(() => sqlite.exec("INSERT INTO people VALUES ('p_two','Name','viewer',2)")).toThrow();
    sqlite.exec(
      "INSERT INTO assistant_settings (protocol,base_url,api_key,model,enabled) VALUES ('openai-chat','','','',0)",
    );
    expect(() =>
      sqlite.exec("INSERT INTO assistant_settings VALUES (2,'anthropic','','','',0)"),
    ).toThrow();
    sqlite.exec(
      "INSERT INTO person_bindings VALUES ('binding','p_one','feishu','external','name',1)",
    );
    expect(() =>
      sqlite.exec(
        "INSERT INTO person_bindings VALUES ('binding2','p_one','feishu','external','name',1)",
      ),
    ).toThrow();
    sqlite.exec("INSERT INTO assistant_sessions VALUES ('web','chat','p_one','[]',NULL,1)");
    expect(() =>
      sqlite.exec("INSERT INTO assistant_sessions VALUES ('web','chat','p_one','[]',NULL,2)"),
    ).toThrow();
  } finally {
    sqlite.close();
  }
});
test("upgrading a local 0010 database copy preserves every old task column and the tasks table definition", () => {
  const dir = mkdtempSync(join(tmpdir(), "idesk-people-migration-"));
  let sqlite: Database.Database | undefined;
  try {
    const oldFolder = join(dir, "old");
    mkdirSync(join(oldFolder, "meta"), { recursive: true });
    const journal = JSON.parse(
      readFileSync(join(migrationsFolder, "meta/_journal.json"), "utf8"),
    ) as { entries: { idx: number; tag: string }[] };
    const entries = journal.entries.filter((entry) => entry.idx <= 10);
    for (const entry of entries)
      copyFileSync(join(migrationsFolder, `${entry.tag}.sql`), join(oldFolder, `${entry.tag}.sql`));
    writeFileSync(join(oldFolder, "meta/_journal.json"), JSON.stringify({ ...journal, entries }));
    const original = join(dir, "original.db");
    sqlite = new Database(original);
    migrate(drizzle(sqlite), { migrationsFolder: oldFolder });
    const insert = sqlite.prepare(`INSERT INTO tasks
      (id,title,body,status,priority,blocked_by,tags,capabilities,publisher_id,assignee_id,recruit,lease_expires_at,result,due_at,created_at,updated_at,completed_at)
      VALUES (@id,'title','body',@status,'high','["block"]','["tag"]','["coding"]',@publisher,'worker','{"needed":2,"joined":["worker"]}',123,'result',456,789,1011,1213)`);
    insert.run({ id: "human-task", status: "open", publisher: "human" });
    insert.run({ id: "agent-task", status: "in_progress", publisher: "old-agent" });
    insert.run({ id: "done-task", status: "done", publisher: "human" });
    const before = sqlite.prepare("SELECT * FROM tasks ORDER BY id").all();
    const definition = sqlite.prepare("SELECT sql FROM sqlite_master WHERE name='tasks'").get();
    sqlite.close();
    const copy = join(dir, "copy.db");
    copyFileSync(original, copy);
    sqlite = new Database(copy);
    migrate(drizzle(sqlite), { migrationsFolder });
    expect(sqlite.prepare("SELECT * FROM tasks ORDER BY id").all()).toEqual(before);
    expect(sqlite.prepare("SELECT sql FROM sqlite_master WHERE name='tasks'").get()).toEqual(
      definition,
    );
    expect(sqlite.prepare("SELECT * FROM people").all()).toEqual([]);
    migrate(drizzle(sqlite), { migrationsFolder });
    expect(sqlite.prepare("SELECT * FROM tasks ORDER BY id").all()).toEqual(before);
  } finally {
    sqlite?.close();
    rmSync(dir, { recursive: true, force: true });
  }
});
