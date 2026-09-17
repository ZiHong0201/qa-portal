// Reports how many active questions still have no explanation, by set.
import "dotenv/config";
import { createClient } from "@libsql/client";

const client = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

const rs = await client.execute(`
  SELECT s.subject, s.title, s.id,
         COUNT(*) AS total,
         SUM(CASE WHEN q.explanation IS NULL OR TRIM(q.explanation) = '' THEN 1 ELSE 0 END) AS missing
  FROM Question q JOIN QuestionSet s ON s.id = q.questionSetId
  WHERE q.isActive = 1
  GROUP BY s.id ORDER BY s.subject, s.title`);

let total = 0;
let missing = 0;
let subject = "";
for (const r of rs.rows) {
  total += Number(r.total);
  missing += Number(r.missing);
  if (r.subject !== subject) {
    subject = r.subject;
    console.log(`\n== ${subject} ==`);
  }
  const done = Number(r.total) - Number(r.missing);
  const mark = Number(r.missing) === 0 ? "OK  " : "TODO";
  console.log(`${mark} ${String(done).padStart(3)}/${String(r.total).padEnd(3)} ${r.title}  ${r.id}`);
}
console.log(`\nTOTAL ${total - missing} / ${total} explained - ${missing} still missing`);
