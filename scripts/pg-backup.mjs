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
if (!databaseUrl) {
  console.error("DATABASE_URL is required.");
  process.exit(1);
}

const backupDir = path.resolve(rootDir, process.env.PG_BACKUP_DIR?.trim() || "pg-backups");
const relativeBackupDir = path.relative(rootDir, backupDir);
if ((!relativeBackupDir || (!relativeBackupDir.startsWith("..") && !path.isAbsolute(relativeBackupDir))) && process.env.NODE_ENV === "production") {
  console.error(`PG_BACKUP_DIR must be outside the application folder in production: ${backupDir}`);
  process.exit(1);
}

fs.mkdirSync(backupDir, { recursive: true });
const pgBinDir = process.env.PG_BIN_DIR?.trim();
const pgDump = pgBinDir ? path.join(pgBinDir, process.platform === "win32" ? "pg_dump.exe" : "pg_dump") : "pg_dump";

const now = new Date();
const timestamp = [
  now.getFullYear(),
  String(now.getMonth() + 1).padStart(2, "0"),
  String(now.getDate()).padStart(2, "0"),
  "-",
  String(now.getHours()).padStart(2, "0"),
  String(now.getMinutes()).padStart(2, "0"),
  String(now.getSeconds()).padStart(2, "0"),
].join("");
const backupPath = path.join(backupDir, `ugc-it-service-${timestamp}.dump`);
const childEnv = { ...process.env };
if (!childEnv.PGSSLMODE?.trim()) {
  delete childEnv.PGSSLMODE;
}

const result = spawnSync(pgDump, ["--format=custom", "--file", backupPath, databaseUrl], {
  env: childEnv,
  stdio: "inherit",
  shell: false,
});

if (result.status !== 0) {
  console.error("pg_dump failed. Ensure PostgreSQL bin folder is in PATH.");
  process.exit(result.status ?? 1);
}

console.log(`PostgreSQL backup created: ${backupPath}`);
