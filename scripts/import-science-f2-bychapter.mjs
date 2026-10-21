// Adds "SCIENCE F2/F2 Science Objective by Chapter (EN-BM).docx" - 336
// bilingual objective questions, chapter by chapter - to the existing Form 2
// Science chapter sets (Bab 1 to Bab 13), after the questions already there.
//
// The document came without an answer key, so ANSWERS below were worked out
// question by question - the 83 diagram questions against their diagrams.
// The ones worth a second look are listed in UNSURE; any answer can be
// corrected on the question's edit screen in admin.
//
// Run scripts/parse-science-f2-bychapter.py first; this reads its JSON and
// pictures.
//
// Usage:
//   node scripts/import-science-f2-bychapter.mjs <questions.json> <imageDir> --dry-run
//   node scripts/import-science-f2-bychapter.mjs <questions.json> <imageDir>
import "dotenv/config";
import fs from "fs";
import path from "path";
import crypto from "crypto";
import { fileURLToPath } from "url";
import { createClient } from "@libsql/client";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const [jsonPath, imageDir] = process.argv.slice(2);
const DRY_RUN = process.argv.includes("--dry-run");

const GRADE = "Form 2";
const SUBJECT = "Science";
const POINTS = 10;

// One letter per question, in the document's order within each chapter.
// prettier-ignore
const ANSWERS = {
  1: "DBDDCADDDDADCDBCCDCABCADBDCAADBABCAACD",
  2: "CCDAABAABAADBAABDBDDCAABAABBCBCDBBB",
  3: "ABCBDABADBDACCADBCBDDDDCCBDCDAACDCAB",
  4: "DCCBCBADCDCDBBACDAACBCDABAACDAC",
  5: "DDBCBDBCCAADBBCDBACDBBBAADCA",
  6: "CDDBBCAACACABCBCAACCADCDCD",
  7: "AAAABACCCDABABDACBACADBABAB",
  8: "BDDAADDCABDCDACCBAADAACCBA",
  9: "CCCADBDBBAACDAACDDCDBBDC",
  10: "ABABCDBACAADDBDB",
  11: "BDABACBCBDCAADDAACAD",
  12: "ABCBDACDDDCACBACBA",
  13: "BDABBCAABCD",
};

// Mistakes in the document, put right: an option list repeating a numeral
// ("II, III and III"), and an option left blank. Keyed chapter -> question.
const OPTION_FIXES = {
  1: {
    24: { D: "I, II dan III / I, II and III" },
    25: { B: "II dan III / II and III" },
  },
  3: { 25: { C: "III dan IV / III and IV", D: "I dan IV / I and IV" } },
  4: { 17: { C: "III dan IV / III and IV", D: "I dan IV / I and IV" } },
  7: { 14: { B: "Paku besi akan menjadi magnet. / The iron nail will become a magnet." } },
  10: { 15: { B: "II dan III / II and III", C: "III dan IV / III and IV" } },
};

// Answers where the question allows more than one reading - for a second look.
const UNSURE = [
  "Ch1 Q25 endemic species: option B was 'II and II', taken as 'II and III' (Malayan tiger, leatherback turtle)",
  "Ch2 Q35 solving environmental effects: B (laws + biological control); 'waste disposal' IV is arguable",
  "Ch3 Q6 J is the small intestine: absorption A chosen; maltose -> glucose D also happens there",
  "Ch3 Q34 night vision: fish oil C chosen; liver D is also a vitamin A source",
  "Ch4 Q20 chicken pox: air C chosen; it also spreads by contact B",
  "Ch5 Q13 removes odour: distillation B chosen",
  "Ch5 Q25 kills microorganisms: boiling + chlorination A chosen; distillation also does",
  "Ch7 Q14 option B was blank in the document; filled as 'The iron nail will become a magnet' (the answer)",
  "Ch7 Q21 magnetic field pattern: A chosen; the arrows are small in the scan",
  "Ch10 Q8 sound: 'can be reflected' A chosen; it can also be refracted C",
  "Ch10 Q13 'not true': A and D are both false; D chosen",
  "Ch11 Q2 Crab Nebula: no option says supernova remnant; D chosen",
  "Ch11 Q7 classifying stars: brightness + colour B chosen",
  "Ch11 Q14 final stage of a star: black hole D chosen (white dwarf for smaller stars)",
  "Ch12 Q15 gas giants: all four are, every option lists three; A chosen",
];

if (!jsonPath || !imageDir) {
  console.error("Usage: node scripts/import-science-f2-bychapter.mjs <questions.json> <imageDir> [--dry-run]");
  process.exit(1);
}

const questions = JSON.parse(fs.readFileSync(jsonPath, "utf8"));
const bodyOf = (q) =>
  q.stem
    .map((p) => p.trim())
    .filter(Boolean)
    .join("\n\n");

// ---- checks before anything is written --------------------------------------
const byChapter = new Map();
for (const q of questions) {
  if (!byChapter.has(q.chapter)) byChapter.set(q.chapter, []);
  byChapter.get(q.chapter).push(q);
}
for (const [ch, qs] of byChapter) {
  const key = ANSWERS[ch];
  if (!key || key.length !== qs.length) throw new Error(`Chapter ${ch}: ${qs.length} questions, ${key?.length ?? 0} answers.`);
  for (const [i, q] of qs.entries()) {
    if (q.number !== i + 1) throw new Error(`Chapter ${ch}: question ${i + 1} is numbered ${q.number}.`);
    const fixes = OPTION_FIXES[ch]?.[q.number] ?? {};
    for (const o of q.options) if (fixes[o.letter]) o.text = fixes[o.letter];
    if (q.options.map((o) => o.letter).join("") !== "ABCD") throw new Error(`Ch${ch} Q${q.number}: options are not A-D.`);
    if (q.options.some((o) => !o.text.trim())) throw new Error(`Ch${ch} Q${q.number}: an option is blank.`);
    q.answer = key[i];
  }
}
const tally = { A: 0, B: 0, C: 0, D: 0 };
for (const q of questions) tally[q.answer]++;
console.log(`${questions.length} questions in ${byChapter.size} chapters, ${questions.filter((q) => q.images.length).length} with a picture`);
console.log(`answer spread: ${Object.entries(tally).map(([k, v]) => `${k} ${v}`).join(", ")}`);

// ---- the chapter sets ---------------------------------------------------------
const db = createClient({
  url: process.env.TURSO_DATABASE_URL.replace(/^libsql:\/\//, "https://"),
  authToken: process.env.TURSO_AUTH_TOKEN,
});
const sets = new Map();
for (const ch of byChapter.keys()) {
  const r = await db.execute({
    sql: `SELECT s.id, s.title, s.createdById,
            (SELECT COUNT(*) FROM Question q WHERE q.questionSetId = s.id) AS n,
            (SELECT MAX(q.createdAt) FROM Question q WHERE q.questionSetId = s.id) AS lastAt
          FROM QuestionSet s
          WHERE s.title LIKE ? AND s.subject = ?
            AND EXISTS (SELECT 1 FROM QuestionSetGrade g WHERE g.questionSetId = s.id AND g.grade = ?)`,
    args: [`Bab ${ch}:%`, SUBJECT, GRADE],
  });
  if (r.rows.length !== 1) throw new Error(`Chapter ${ch}: expected one Form 2 Science "Bab ${ch}:" set, found ${r.rows.length}.`);
  sets.set(ch, r.rows[0]);
}

// Not twice: if any of these questions is already in its chapter's set, stop.
for (const [ch, qs] of byChapter) {
  const existing = await db.execute({ sql: "SELECT body FROM Question WHERE questionSetId = ?", args: [sets.get(ch).id] });
  const have = new Set(existing.rows.map((r) => r.body));
  const dup = qs.filter((q) => have.has(bodyOf(q)));
  if (dup.length) throw new Error(`Chapter ${ch}: ${dup.length} of these questions are already in "${sets.get(ch).title}" - not importing twice.`);
}

for (const [ch, qs] of byChapter) {
  const s = sets.get(ch);
  console.log(`  ${s.title}: ${s.n} now + ${qs.length} = ${Number(s.n) + qs.length}`);
}

if (DRY_RUN) {
  const sample = byChapter.get(7)[13];
  console.log(`\nsample - Ch7 Q14 body:\n${bodyOf(sample)}\nimage: ${sample.images[0]}`);
  console.log(`options:\n${sample.options.map((o) => `  ${o.letter}. ${o.text}`).join("\n")}\nanswer: ${sample.answer}`);
  console.log(`\nfor a second look:\n  ${UNSURE.join("\n  ")}`);
  process.exit(0);
}

// ---- import -------------------------------------------------------------------
// Diagrams go to public/, as the other papers' did: fixed scans, never edited.
const publicDir = path.join(HERE, "..", "public", "questions", "science-f2-bychapter");
fs.mkdirSync(publicDir, { recursive: true });
const id = () => crypto.randomUUID();
// Prisma's own text form for DateTime columns.
const iso = (ms) => new Date(ms).toISOString().replace("Z", "+00:00");

const statements = [];
for (const [ch, qs] of byChapter) {
  const s = sets.get(ch);
  // After the set's last question, a millisecond apart: students see questions
  // in createdAt order, so these follow the ones already there, in order.
  const base = Math.max(Date.now(), s.lastAt ? Date.parse(s.lastAt) + 1 : 0);
  for (const [i, q] of qs.entries()) {
    let diagramUrl = null;
    if (q.images[0]) {
      const name = `ch${String(ch).padStart(2, "0")}-q${String(q.number).padStart(2, "0")}.png`;
      fs.copyFileSync(path.join(imageDir, path.basename(q.images[0])), path.join(publicDir, name));
      diagramUrl = `/questions/science-f2-bychapter/${name}`;
    }
    const qid = id();
    const at = iso(base + i);
    statements.push({
      sql: `INSERT INTO Question (id, body, explanation, diagramUrl, type, points, isActive, createdAt, updatedAt, questionSetId, createdById)
            VALUES (?, ?, NULL, ?, 'MULTIPLE_CHOICE', ?, 1, ?, ?, ?, ?)`,
      args: [qid, bodyOf(q), diagramUrl, POINTS, at, at, s.id, s.createdById],
    });
    for (const [j, o] of q.options.entries()) {
      statements.push({
        sql: `INSERT INTO Choice (id, text, isCorrect, "order", questionId) VALUES (?, ?, ?, ?, ?)`,
        args: [id(), o.text, o.letter === q.answer ? 1 : 0, j, qid],
      });
    }
  }
}

// All or nothing: one transaction, so a failure part-way cannot leave half a
// chapter in the portal.
await db.batch(statements, "write");
console.log(`\nadded ${questions.length} questions to ${byChapter.size} chapter sets`);
