import dotenv from "dotenv";
import pg from "pg";
import path from "path";
import { fileURLToPath } from "url";

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

const pool = new pg.Pool({ connectionString: databaseUrl });

try {
  const result = await pool.query(
    "SELECT id, name, email, role, status FROM users WHERE email = $1 OR name = $2",
    ["employee@ugc.gov.bd", "Test Employee"]
  );

  console.log(JSON.stringify(result.rows, null, 2));
  console.log(`row count: ${result.rowCount}`);
} finally {
  await pool.end();
}
