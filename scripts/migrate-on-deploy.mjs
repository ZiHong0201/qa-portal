// Applies pending migrations as part of a Vercel production build, so a
// deploy brings the tables its code needs with it - and fails, leaving the
// previous deployment live, if they cannot be created.
//
// Only production builds migrate. Preview builds of other branches are
// skipped so an unmerged schema change never reaches the live database, and
// so are local builds, which may not have Turso credentials at all.
// `node scripts/migrate-turso.mjs` still applies them by hand.
import { spawnSync } from "child_process";

if (process.env.VERCEL_ENV !== "production") {
  console.log("Skipping database migrations: not a Vercel production build.");
  process.exit(0);
}

const result = spawnSync(process.execPath, ["scripts/migrate-turso.mjs"], { stdio: "inherit" });
process.exit(result.status ?? 1);
