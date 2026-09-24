-- SQLite has no enum type; Prisma enforces Role in the client, so adding a
-- new variant needs no schema change. This migration exists only so the
-- change is recorded in the migration history alongside the schema edit.
SELECT 1;
