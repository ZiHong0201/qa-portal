// Prints a set's questions, choices and correct answers in a compact form, for
// hand-writing explanations against. Usage:
//   node scripts/dump-questions.mjs <setId|titleFragment> [--missing]
// --missing limits output to questions that still have no explanation.
import "dotenv/config";
import { createClient } from "@libsql/client";

const client = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

const target = process.argv[2];
const onlyMissing = process.argv.includes("--missing");
if (!target) {
  console.error("usage: node scripts/dump-questions.mjs <setId|titleFragment> [--missing]");
  process.exit(1);
}

const sets = await client.execute({
  sql: `SELECT id, title, subject FROM QuestionSet WHERE id = ? OR title LIKE ?`,
  args: [target, `%${target}%`],
});
if (sets.rows.length === 0) {
  console.error(`no set matches "${target}"`);
  process.exit(1);
}

for (const set of sets.rows) {
  const questions = await client.execute({
    sql: `SELECT id, body, explanation FROM Question
          WHERE questionSetId = ? AND isActive = 1 ORDER BY createdAt, id`,
    args: [set.id],
  });
  const rows = onlyMissing
    ? questions.rows.filter((q) => !q.explanation || !String(q.explanation).trim())
    : questions.rows;

  console.log(`\n===== ${set.subject} / ${set.title} (${rows.length} shown of ${questions.rows.length}) =====`);
  for (const q of rows) {
    const choices = await client.execute({
      sql: `SELECT text, isCorrect FROM Choice WHERE questionId = ? ORDER BY "order"`,
      args: [q.id],
    });
    console.log(`\n--- ${q.id}`);
    console.log(String(q.body).replace(/\s*\n\s*/g, " | "));
    choices.rows.forEach((ch, i) => {
      console.log(`  ${ch.isCorrect ? "*" : " "}${String.fromCharCode(65 + i)}. ${String(ch.text).replace(/\s*\n\s*/g, " ")}`);
    });
  }
}
