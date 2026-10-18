import { mkdirSync, mkdtempSync } from "node:fs";
import { join } from "node:path";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";

mkdirSync(".test-data", { recursive: true });
process.env.IDESK_DATA_DIR = mkdtempSync(join(".test-data", "file-"));
const sqlite = new Database(join(process.env.IDESK_DATA_DIR, "idesk.db"));
migrate(drizzle(sqlite), { migrationsFolder: new URL("../drizzle", import.meta.url).pathname });
sqlite.close();
