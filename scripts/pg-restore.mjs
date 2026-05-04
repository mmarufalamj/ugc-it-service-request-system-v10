import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");

dotenv.config({ path: path.join(rootDir, ".env.local") });
dotenv.config({ path: path.join(rootDir, ".env") });

const databaseUrl = process.env.DATABASE_URL?.trim();
const backupFile = process.argv[2] ? path.resolve(process.argv[2]) : "";

if (!databaseUrl) {
  console.error("DATABASE_URL is required.");
  process.exit(1);
}

if (!backupFile || !fs.existsSync(backupFile)) {
  console.error("Usage: npm.cmd run pg:restore -- C:\\path\\to\\backup.dump");
  process.exit(1);
}

if (process.env.CONFIRM_PG_RESTORE !== "YES") {
  console.error("Refusing to restore PostgreSQL data. Set CONFIRM_PG_RESTORE=YES to continue.");
  process.exit(1);
}

const pgBinDir = process.env.PG_BIN_DIR?.trim();
const pgRestore = pgBinDir ? path.join(pgBinDir, process.platform === "win32" ? "pg_restore.exe" : "pg_restore") : "pg_restore";
const childEnv = { ...process.env };
if (!childEnv.PGSSLMODE?.trim()) {
  delete childEnv.PGSSLMODE;
}

const result = spawnSync(pgRestore, ["--clean", "--if-exists", "--no-owner", "--dbname", databaseUrl, backupFile], {
  env: childEnv,
  stdio: "inherit",
  shell: false,
});

if (result.status !== 0) {
  console.error("pg_restore failed. Ensure PostgreSQL bin folder is in PATH and the backup is valid.");
  process.exit(result.status ?? 1);
}

console.log(`PostgreSQL restore completed from: ${backupFile}`);
