// Applies hand-written explanations to Turso. Usage:
//   node scripts/apply-explanations.mjs <file.json>
// The file is a plain { "<questionId>": "<explanation>" } map. Ids that don't
// exist, or that already hold the same text, are reported rather than skipped
// silently - a mistyped id is otherwise invisible.
import "dotenv/config";
import { createClient } from "@libsql/client";
import { readFileSync } from "fs";

const client = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

const path = process.argv[2];
if (!path) {
  console.error("usage: node scripts/apply-explanations.mjs <file.json>");
  process.exit(1);
}

const map = JSON.parse(readFileSync(path, "utf8"));
const entries = Object.entries(map);

let updated = 0;
const missing = [];
const tooLong = [];

for (const [id, text] of entries) {
  const value = String(text).trim();
  // Matches the 2000-char cap the admin edit form enforces.
  if (value.length > 2000) {
    tooLong.push(id);
    continue;
  }
  const res = await client.execute({
    sql: `UPDATE Question SET explanation = ? WHERE id = ?`,
    args: [value, id],
  });
  if (res.rowsAffected === 0) missing.push(id);
  else updated += 1;
}

console.log(`applied ${updated} / ${entries.length}`);
if (tooLong.length) console.log(`OVER 2000 CHARS (skipped): ${tooLong.join(", ")}`);
if (missing.length) console.log(`NO SUCH QUESTION: ${missing.join(", ")}`);
