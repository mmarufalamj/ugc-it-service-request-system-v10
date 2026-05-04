import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import pg from "pg";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");

dotenv.config({ path: path.join(rootDir, ".env.local") });
dotenv.config({ path: path.join(rootDir, ".env") });

const checks = [];
const failures = [];

function pass(message) {
  checks.push({ ok: true, message });
}

function fail(message) {
  checks.push({ ok: false, message });
  failures.push(message);
}

function requireEnv(name, validator = (value) => Boolean(value?.trim()), hint = "") {
  const value = process.env[name];
  if (validator(value)) {
    pass(`${name} is set`);
    return value;
  }
  fail(`${name} is missing or invalid${hint ? ` (${hint})` : ""}`);
  return "";
}

const databaseUrl = requireEnv("DATABASE_URL");
requireEnv(
  "SUPER_ADMIN_PASSWORD",
  (value) => Boolean(value?.trim()) && value.trim().length >= 12 && !value.includes("CHANGE_THIS"),
  "use a real password with at least 12 characters",
);
const uploadDirValue = requireEnv("UPLOAD_DIR", (value) => Boolean(value?.trim()), "use a durable folder outside temporary deploy paths");
const backupDirValue = requireEnv("PG_BACKUP_DIR", (value) => Boolean(value?.trim()), "use a durable folder outside temporary deploy paths");
requireEnv("TRUST_PROXY", (value) => value === "true", "set TRUST_PROXY=true behind the HTTPS reverse proxy");

function isInside(parent, child) {
  const relative = path.relative(parent, child);
  return Boolean(relative) && !relative.startsWith("..") && !path.isAbsolute(relative);
}

const uploadDir = uploadDirValue ? path.resolve(rootDir, uploadDirValue) : "";
if (uploadDir) {
  if (isInside(rootDir, uploadDir) || uploadDir === rootDir) {
    fail(`UPLOAD_DIR must be outside the application folder: ${uploadDir}`);
  }

  try {
    fs.mkdirSync(uploadDir, { recursive: true });
    const testPath = path.join(uploadDir, `.preflight-${process.pid}.tmp`);
    fs.writeFileSync(testPath, "ok");
    fs.unlinkSync(testPath);
    pass(`UPLOAD_DIR is writable: ${uploadDir}`);
  } catch (error) {
    fail(`UPLOAD_DIR is not writable: ${uploadDir} (${error.message})`);
  }
}

const backupDir = backupDirValue ? path.resolve(rootDir, backupDirValue) : "";
if (backupDir) {
  if (isInside(rootDir, backupDir) || backupDir === rootDir) {
    fail(`PG_BACKUP_DIR must be outside the application folder: ${backupDir}`);
  }

  try {
    fs.mkdirSync(backupDir, { recursive: true });
    const testPath = path.join(backupDir, `.preflight-${process.pid}.tmp`);
    fs.writeFileSync(testPath, "ok");
    fs.unlinkSync(testPath);
    pass(`PG_BACKUP_DIR is writable: ${backupDir}`);
  } catch (error) {
    fail(`PG_BACKUP_DIR is not writable: ${backupDir} (${error.message})`);
  }
}

if (fs.existsSync(path.join(rootDir, "dist", "index.html"))) {
  pass("Production build exists in dist/");
} else {
  fail("Production build is missing. Run npm.cmd run build.");
}

const pgBinDir = process.env.PG_BIN_DIR?.trim();
const pgDump = pgBinDir ? path.join(pgBinDir, process.platform === "win32" ? "pg_dump.exe" : "pg_dump") : "pg_dump";
const pgDumpResult = spawnSync(pgDump, ["--version"], {
  encoding: "utf8",
  shell: false,
});
if (pgDumpResult.status === 0) {
  pass(`pg_dump is available (${pgDumpResult.stdout.trim() || pgDump})`);
} else {
  fail("pg_dump is not available. Set PG_BIN_DIR to the PostgreSQL bin folder.");
}

const requiredTables = [
  "applications",
  "application_item_assignments",
  "application_tracking_counters",
  "audit_logs",
  "data_share_access_logs",
  "data_share_clients",
  "roles",
  "schema_migrations",
  "system_settings",
  "user_sessions",
  "users",
];

const requiredMigrations = [
  "001_initial_postgres",
  "002_user_sessions",
  "003_assignment_normalization_and_tracking",
  "004_data_share_clients",
  "005_data_share_access_logs",
];

if (databaseUrl) {
  const { Pool } = pg;
  const pool = new Pool({
    connectionString: databaseUrl,
    ssl: process.env.PGSSLMODE === "require" ? { rejectUnauthorized: false } : undefined,
  });

  try {
    await pool.query("SELECT 1");
    pass("PostgreSQL connection succeeded");

    const tables = await pool.query(
      `
        SELECT table_name
        FROM information_schema.tables
        WHERE table_schema = 'public'
          AND table_type = 'BASE TABLE'
          AND table_name = ANY($1)
      `,
      [requiredTables],
    );
    const existingTables = new Set(tables.rows.map((row) => row.table_name));
    for (const table of requiredTables) {
      if (existingTables.has(table)) {
        pass(`Table exists: ${table}`);
      } else {
        fail(`Missing table: ${table}. Run npm.cmd run db:migrate:pg.`);
      }
    }

    if (existingTables.has("schema_migrations")) {
      const migrations = await pool.query("SELECT version FROM schema_migrations WHERE version = ANY($1)", [requiredMigrations]);
      const applied = new Set(migrations.rows.map((row) => row.version));
      for (const version of requiredMigrations) {
        if (applied.has(version)) {
          pass(`Migration applied: ${version}`);
        } else {
          fail(`Migration not applied: ${version}. Run npm.cmd run db:migrate:pg.`);
        }
      }
    }

    if (existingTables.has("users")) {
      const adminUsers = await pool.query("SELECT COUNT(*)::int AS count FROM users WHERE role = 'admin' AND status = 'Active'");
      if (adminUsers.rows[0]?.count > 0) {
        pass("At least one active admin user exists");
      } else {
        fail("No active admin user found");
      }

      const usersMissingHash = await pool.query("SELECT COUNT(*)::int AS count FROM users WHERE password_hash IS NULL OR password_hash = ''");
      if (usersMissingHash.rows[0]?.count === 0) {
        pass("All users have password_hash values");
      } else {
        fail(`${usersMissingHash.rows[0].count} user(s) are missing password_hash`);
      }
    }
  } catch (error) {
    fail(`PostgreSQL preflight failed: ${error.message}`);
  } finally {
    await pool.end().catch(() => undefined);
  }
}

console.log("");
console.log("Production preflight");
console.log("====================");
for (const check of checks) {
  console.log(`${check.ok ? "[OK]" : "[FAIL]"} ${check.message}`);
}

if (failures.length > 0) {
  console.error("");
  console.error(`${failures.length} production preflight check(s) failed on ${os.hostname()}.`);
  process.exit(1);
}

console.log("");
console.log("Production preflight passed.");
