import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import Database from "better-sqlite3";
import pg from "pg";

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

if (process.env.CONFIRM_PG_COPY !== "YES") {
  console.error("Refusing to overwrite PostgreSQL data. Set CONFIRM_PG_COPY=YES to run this one-time import.");
  process.exit(1);
}

const sqlitePath = process.env.DATABASE_PATH?.trim()
  ? path.resolve(rootDir, process.env.DATABASE_PATH.replace(/^['"]|['"]$/g, ""))
  : path.join(rootDir, "data", "database.sqlite");

const sqlite = new Database(sqlitePath, { readonly: true });
const { Pool } = pg;
const pool = new Pool({
  connectionString: databaseUrl,
  ssl: process.env.PGSSLMODE === "require" ? { rejectUnauthorized: false } : undefined,
});

const tables = [
  "users",
  "roles",
  "divisions",
  "applications",
  "system_settings",
  "telephone_directory_entries",
  "audit_logs",
];

const columnsByTable = {
  users: [
    "id", "name", "email", "password", "password_hash", "name_bn", "role", "division", "status",
    "photo", "signature", "pending_signature", "signature_pending_at", "must_change_password",
    "designation", "mobile", "extra_permissions", "denied_permissions",
  ],
  roles: ["id", "name", "slug", "name_bn", "description", "permissions", "status"],
  divisions: ["id", "name", "head", "employees", "status"],
  applications: [
    "id", "tracking_no", "user_email", "user_name", "division", "service_type", "problem_details",
    "category_problem_details", "status", "submission_date", "applicant_signature", "applicant_signed_at",
    "div_head_signature", "div_head_signed_at", "div_head_email", "designation", "mobile",
    "officer_signature", "officer_signed_at", "officer_name", "hw_officer_sig", "hw_officer_date",
    "hw_officer_name", "nw_officer_sig", "nw_officer_date", "nw_officer_name", "sw_officer_sig",
    "sw_officer_date", "sw_officer_name", "mnt_officer_sig", "mnt_officer_date", "mnt_officer_name",
    "officer_designation", "officer_service_info", "officer_action_details",
  ],
  system_settings: ["key", "value"],
  telephone_directory_entries: ["id", "name", "designation", "division", "intercom", "mobile", "ip_number", "email", "room_no", "notes", "status"],
  audit_logs: ["id", "created_at", "user_email", "user_name", "user_role", "action", "method", "path", "status_code", "details"],
};

const normalizeValue = (table, column, value) => {
  if (column === "must_change_password") return !!value;
  if (value === undefined) return null;
  return value;
};

try {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    for (const table of tables) {
      await client.query(`TRUNCATE TABLE ${table} RESTART IDENTITY CASCADE`);
    }

    for (const table of tables) {
      const columns = columnsByTable[table];
      const rows = sqlite.prepare(`SELECT ${columns.join(", ")} FROM ${table}`).all();
      if (rows.length === 0) {
        console.log(`${table}: 0 rows`);
        continue;
      }

      const quotedColumns = columns.map((column) => `"${column}"`).join(", ");
      const placeholders = columns.map((_, index) => `$${index + 1}`).join(", ");
      const sql = `INSERT INTO ${table} (${quotedColumns}) VALUES (${placeholders})`;

      for (const row of rows) {
        await client.query(sql, columns.map((column) => normalizeValue(table, column, row[column])));
      }

      if (columns.includes("id")) {
        await client.query(`
          SELECT setval(
            pg_get_serial_sequence('${table}', 'id'),
            COALESCE((SELECT MAX(id) FROM ${table}), 1),
            (SELECT COUNT(*) FROM ${table}) > 0
          )
        `);
      }
      console.log(`${table}: ${rows.length} rows`);
    }

    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
} finally {
  await pool.end();
  sqlite.close();
}
