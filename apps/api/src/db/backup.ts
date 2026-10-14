import { join } from "node:path";
import Database from "better-sqlite3";
import { config } from "../config.ts";

// 用 SQLite 在线备份 API 复制数据库，WAL 里未落盘的事务也包含在内；直接拷文件做不到这一点
const target =
  process.argv[2] ??
  join(config.IDESK_DATA_DIR, `idesk-${new Date().toISOString().slice(0, 10)}.db`);
await new Database(join(config.IDESK_DATA_DIR, "idesk.db"), { readonly: true }).backup(target);
console.log(target);
