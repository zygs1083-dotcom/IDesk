import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { db } from "./client.ts";

migrate(db, { migrationsFolder: new URL("../../drizzle", import.meta.url).pathname });
console.log("migrated");
