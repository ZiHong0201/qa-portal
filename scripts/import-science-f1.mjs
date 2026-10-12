// Imports "Sains F1 - Kertas Soalan (100 MCQ).docx" as one Form 1 Science set.
//
// The paper is Mr Tan's own, bilingual (Malay then English) and came without
// an answer sheet, so ANSWERS below were worked out question by question -
// the 69 diagram questions against their diagrams. Mr Tan should check them;
// once imported, a correction is made on the question's edit screen in admin.
//
// Run scripts/parse-science-f1.py first; this reads its JSON and images.
//
// Usage:
//   node scripts/import-science-f1.mjs <questions.json> <imageDir> --dry-run
//   node scripts/import-science-f1.mjs <questions.json> <imageDir>
import "dotenv/config";
import fs from "fs";
import path from "path";
import crypto from "crypto";
import { fileURLToPath } from "url";
import { createClient } from "@libsql/client";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const [jsonPath, imageDir] = process.argv.slice(2);
const DRY_RUN = process.argv.includes("--dry-run");

const TITLE = "Sains Tingkatan 1 / Science Form 1 — 100 Soalan Objektif";
const DESCRIPTION =
  "Kertas objektif dwibahasa, Bab 1–9. / Bilingual objective paper covering Chapters 1–9: " +
  "Scientific Investigation, Cells, Coordination and Response, Reproduction, Matter, " +
  "the Periodic Table, Air, Light and Optics, and the Earth.";
const SUBJECT = "Science";
const GRADE = "Form 1";
const POINTS = 10;

// prettier-ignore
const ANSWERS = [
  // 1-10                                   11-20
  "C","D","B","D","D","A","B","C","B","D",  "C","A","B","B","A","D","A","A","D","B",
  // 21-30                                  31-40
  "A","D","B","A","D","B","C","D","C","A",  "B","D","A","C","B","C","C","A","B","D",
  // 41-50                                  51-60
  "B","D","D","C","C","A","A","B","C","C",  "A","A","B","D","B","C","C","B","C","D",
  // 61-70                                  71-80
  "A","B","B","C","C","D","B","A","B","C",  "A","C","A","D","C","C","D","A","D","A",
  // 81-90                                  91-100
  "D","D","A","D","A","B","C","B","D","A",  "A","C","A","B","B","C","C","D","B","D",
];

// On paper these share the facing page's diagram ("Use Diagram 15 to answer
// this question"). In the portal each question stands alone, so they carry
// that diagram themselves - otherwise they arrive with nothing to look at.
const BORROWED_DIAGRAM = { 16: 15, 18: 17 };

if (!jsonPath || !imageDir) {
  console.error("Usage: node scripts/import-science-f1.mjs <questions.json> <imageDir> [--dry-run]");
  process.exit(1);
}

const questions = JSON.parse(fs.readFileSync(jsonPath, "utf8"));
if (questions.length !== 100 || ANSWERS.length !== 100) {
  throw new Error(`Expected 100 questions and 100 answers, got ${questions.length} and ${ANSWERS.length}.`);
}

// A stem paragraph is "Malay\nEnglish"; paragraphs are separated by a blank
// line so the two languages stay paired and the parts stay apart.
const bodyOf = (q) =>
  q.stem
    .map((p) => p.trim())
    .filter(Boolean)
    .join("\n\n");

const imageOf = (n) => {
  const q = questions[n - 1];
  return q.images[0] ?? (BORROWED_DIAGRAM[n] ? questions[BORROWED_DIAGRAM[n] - 1].images[0] : null);
};

// ---- checks before anything is written --------------------------------------
const tally = { A: 0, B: 0, C: 0, D: 0 };
for (const [i, q] of questions.entries()) {
  if (q.n !== i + 1) throw new Error(`Question ${i + 1} is numbered ${q.n}.`);
  if (q.options.map((o) => o.letter).join("") !== "ABCD") throw new Error(`Q${q.n} options are not A-D.`);
  if (!"ABCD".includes(ANSWERS[i])) throw new Error(`Q${q.n} answer ${ANSWERS[i]} is not A-D.`);
  tally[ANSWERS[i]]++;
}
const withPicture = questions.filter((q) => imageOf(q.n)).length;
console.log(`${questions.length} questions, ${withPicture} with a diagram (Q16 and Q18 borrow theirs)`);
console.log(`answer spread: ${Object.entries(tally).map(([k, v]) => `${k} ${v}`).join(", ")}`);

if (DRY_RUN) {
  const q = questions[2];
  console.log(`\nsample - Q3 body:\n${bodyOf(q)}\nimage: ${imageOf(3)}`);
  console.log(`options:\n${q.options.map((o) => `  ${o.letter}. ${o.text}`).join("\n")}\nanswer: ${ANSWERS[2]}`);
  process.exit(0);
}

// ---- import ---------------------------------------------------------------
const db = createClient({
  url: process.env.TURSO_DATABASE_URL.replace(/^libsql:\/\//, "https://"),
  authToken: process.env.TURSO_AUTH_TOKEN,
});
const id = () => crypto.randomUUID();
// Prisma's own text form for DateTime columns.
const iso = (ms) => new Date(ms).toISOString().replace("Z", "+00:00");

const dup = await db.execute({ sql: "SELECT id FROM QuestionSet WHERE title = ?", args: [TITLE] });
if (dup.rows.length) throw new Error(`A set called "${TITLE}" already exists - not importing twice.`);

const admin = await db.execute("SELECT id FROM User WHERE role = 'ADMIN' ORDER BY createdAt LIMIT 1");
const createdById = admin.rows[0].id;

// Diagrams go to public/, as the English papers' did: they are static scans
// that will never be edited, so Blob's ability to change them without a
// deploy buys nothing.
const publicDir = path.join(HERE, "..", "public", "questions", "science-f1");
fs.mkdirSync(publicDir, { recursive: true });
const urlFor = {};
for (const q of questions) {
  const src = imageOf(q.n);
  if (!src) continue;
  const name = `q${String(q.n).padStart(3, "0")}.png`;
  fs.copyFileSync(path.join(imageDir, path.basename(src)), path.join(publicDir, name));
  urlFor[q.n] = `/questions/science-f1/${name}`;
}

const setId = id();
const base = Date.now();
const statements = [
  {
    sql: `INSERT INTO QuestionSet (id, title, description, subject, isActive, createdAt, updatedAt, createdById)
          VALUES (?, ?, ?, ?, 1, ?, ?, ?)`,
    args: [setId, TITLE, DESCRIPTION, SUBJECT, iso(base), iso(base), createdById],
  },
  {
    sql: `INSERT INTO QuestionSetGrade (id, questionSetId, grade, createdAt) VALUES (?, ?, ?, ?)`,
    args: [id(), setId, GRADE, iso(base)],
  },
];

for (const [i, q] of questions.entries()) {
  const qid = id();
  // One millisecond apart: students see questions in createdAt order, and a
  // tie would let two of them swap places.
  const at = iso(base + 1 + i);
  statements.push({
    sql: `INSERT INTO Question (id, body, explanation, diagramUrl, type, points, isActive, createdAt, updatedAt, questionSetId, createdById)
          VALUES (?, ?, NULL, ?, 'MULTIPLE_CHOICE', ?, 1, ?, ?, ?, ?)`,
    args: [qid, bodyOf(q), urlFor[q.n] ?? null, POINTS, at, at, setId, createdById],
  });
  for (const [j, o] of q.options.entries()) {
    statements.push({
      sql: `INSERT INTO Choice (id, text, isCorrect, "order", questionId) VALUES (?, ?, ?, ?, ?)`,
      args: [id(), o.text, o.letter === ANSWERS[i] ? 1 : 0, j, qid],
    });
  }
}

// All or nothing: one transaction, so a failure part-way cannot leave half a
// paper in the portal.
await db.batch(statements, "write");
console.log(`\nimported set ${setId}: ${questions.length} questions, ${Object.keys(urlFor).length} diagrams`);
