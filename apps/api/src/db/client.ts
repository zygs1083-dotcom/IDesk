import { mkdirSync } from "node:fs";
import { join } from "node:path";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { config } from "../config.ts";
import * as schema from "./schema.ts";

mkdirSync(config.IDESK_DATA_DIR, { recursive: true });

const sqlite = new Database(join(config.IDESK_DATA_DIR, "idesk.db"));
sqlite.pragma("journal_mode = WAL");
sqlite.pragma("foreign_keys = ON");

export const db = drizzle(sqlite, { schema });
export type Db = typeof db;
export type Tx = Parameters<Parameters<Db["transaction"]>[0]>[0];
