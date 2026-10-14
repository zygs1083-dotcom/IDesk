import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { env } from "../env.js";
import * as schema from "./schema.js";

export type Db = ReturnType<typeof createDb>;

export function createDb(file = path.join(env.IDESK_DATA_DIR, "idesk.db")) {
  if (file !== ":memory:") fs.mkdirSync(path.dirname(file), { recursive: true });
  const sqlite = new Database(file);
  sqlite.pragma("journal_mode = WAL");
  sqlite.pragma("foreign_keys = ON");
  sqlite.pragma("busy_timeout = 5000");
  return drizzle(sqlite, { schema });
}

export function runMigrations(db: Db) {
  const here = path.dirname(fileURLToPath(import.meta.url));
  const migrationsFolder = path.resolve(here, "../../drizzle");
  migrate(db, { migrationsFolder });
}

let instance: Db | null = null;
export function getDb(): Db {
  if (!instance) instance = createDb();
  return instance;
}
export function setDb(db: Db) {
  instance = db;
}
export { schema };
