// Applies pending prisma/migrations/*/migration.sql files directly to the
// Turso database over its HTTP API, and records them in a `_prisma_migrations`
// table (matching Prisma's own format) so this script knows what's already
// applied on the next run.
//
// This exists because `prisma migrate dev`/`deploy` can't target a
// `libsql://` datasource directly - Prisma's migration engine needs either a
// local file or the Turso CLI, and the Turso CLI requires WSL on Windows.
// Whenever the schema changes, run `prisma migrate dev` locally (against the
// local dev.db) as usual to generate the new migration file, then run this
// script to apply it to Turso: `node scripts/migrate-turso.mjs`
import "dotenv/config";
import { createClient } from "@libsql/client";
import { readFileSync, readdirSync } from "fs";
import { createHash, randomUUID } from "crypto";
import path from "path";

const client = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

const MIGRATIONS_DIR = path.join(process.cwd(), "prisma", "migrations");

async function ensureMigrationsTable() {
  await client.execute(`
    CREATE TABLE IF NOT EXISTS "_prisma_migrations" (
      "id" TEXT PRIMARY KEY NOT NULL,
      "checksum" TEXT NOT NULL,
      "finished_at" DATETIME,
      "migration_name" TEXT NOT NULL,
      "logs" TEXT,
      "rolled_back_at" DATETIME,
      "started_at" DATETIME NOT NULL DEFAULT current_timestamp,
      "applied_steps_count" INTEGER UNSIGNED NOT NULL DEFAULT 0
    )
  `);
}

async function alreadyApplied(name) {
  const res = await client.execute({
    sql: `SELECT 1 FROM "_prisma_migrations" WHERE migration_name = ? AND finished_at IS NOT NULL`,
    args: [name],
  });
  return res.rows.length > 0;
}

async function applyMigration(dirName) {
  if (await alreadyApplied(dirName)) {
    console.log(`skip (already applied): ${dirName}`);
    return;
  }

  const sqlPath = path.join(MIGRATIONS_DIR, dirName, "migration.sql");
  const sql = readFileSync(sqlPath, "utf8");
  const checksum = createHash("sha256").update(sql).digest("hex");

  console.log(`applying: ${dirName}`);
  await client.executeMultiple(sql);

  await client.execute({
    sql: `INSERT INTO "_prisma_migrations" (id, checksum, finished_at, migration_name, started_at, applied_steps_count) VALUES (?, ?, CURRENT_TIMESTAMP, ?, CURRENT_TIMESTAMP, 1)`,
    args: [randomUUID(), checksum, dirName],
  });
}

async function main() {
  if (!process.env.TURSO_DATABASE_URL || !process.env.TURSO_AUTH_TOKEN) {
    throw new Error("Set TURSO_DATABASE_URL and TURSO_AUTH_TOKEN in .env first.");
  }

  await ensureMigrationsTable();

  const dirs = readdirSync(MIGRATIONS_DIR, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name)
    .sort();

  for (const dir of dirs) {
    await applyMigration(dir);
  }

  console.log("Done.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
