#!/usr/bin/env node
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import pg from "pg";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");

dotenv.config({ path: path.join(rootDir, ".env.local") });
dotenv.config({ path: path.join(rootDir, ".env") });

const databaseUrl = process.env.DATABASE_URL?.trim();

if (!databaseUrl) {
  console.warn("⚠ DATABASE_URL is not set. Using SQLite (local development).");
  process.exit(0);
}

console.log("Checking PostgreSQL migrations...\n");

const { Pool } = pg;
const pool = new Pool({
  connectionString: databaseUrl,
  ssl: process.env.PGSSLMODE === "require" ? { rejectUnauthorized: false } : undefined,
});

try {
  // Test connection
  console.log("Testing database connection...");
  await pool.query("SELECT 1");
  console.log("✓ Database connection successful\n");

  // Get expected migrations
  const migrationsDir = path.join(rootDir, "migrations");
  const expectedMigrations = fs
    .readdirSync(migrationsDir)
    .filter((file) => /^\d+_.+\.sql$/.test(file))
    .map(file => file.replace(/\.sql$/, ""))
    .sort();

  // Check if schema_migrations table exists
  const tableCheck = await pool.query(
    `SELECT table_name FROM information_schema.tables 
     WHERE table_schema = 'public' AND table_name = 'schema_migrations'`
  );

  if (tableCheck.rows.length === 0) {
    console.error("❌ schema_migrations table does not exist.");
    console.error("   Run 'npm run db:migrate:pg' to apply migrations.\n");
    process.exit(1);
  }

  // Get applied migrations
  const migrationsResult = await pool.query("SELECT version FROM schema_migrations ORDER BY version");
  const appliedMigrations = new Set(migrationsResult.rows.map(r => r.version));

  console.log("Migration Status:");
  console.log("================\n");

  let allApplied = true;
  for (const migration of expectedMigrations) {
    const applied = appliedMigrations.has(migration);
    const status = applied ? "✓" : "✗";
    console.log(`${status} ${migration}.sql`);
    if (!applied) allApplied = false;
  }

  console.log();
  
  if (allApplied) {
    console.log("✓ All migrations are applied. Database is ready!\n");
    process.exit(0);
  } else {
    console.error("❌ Some migrations are missing.");
    console.error("   Run 'npm run db:migrate:pg' to apply pending migrations.\n");
    process.exit(1);
  }

} catch (error) {
  console.error("❌ Migration check failed:", error.message);
  console.error("   Make sure DATABASE_URL is set correctly.\n");
  process.exit(1);
} finally {
  await pool.end();
}
