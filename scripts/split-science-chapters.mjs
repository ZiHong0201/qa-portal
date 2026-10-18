// Splits an imported 100-question Science paper into one set per chapter,
// following the paper's own "Bab N" headings.
//
// Questions are moved, not copied: their ids, answers, diagrams and any
// submissions stay as they are, and live games built from the paper keep
// working because they snapshot question ids. The original set becomes Bab 1
// (so nothing is deleted); the other chapters are new sets.
//
// Students see sets newest first, so the chapter sets are stamped a
// millisecond apart with Bab 1 newest - the list then reads Bab 1, 2, 3...
//
// Run scripts/parse-science-f<form>.py first; this reads its JSON for the
// chapter of each question, and checks every question against the database
// by text before moving anything.
//
// Usage:
//   node scripts/split-science-chapters.mjs <form: 1|2> <questions.json> --dry-run
//   node scripts/split-science-chapters.mjs <form: 1|2> <questions.json>
import "dotenv/config";
import fs from "fs";
import crypto from "crypto";
import { createClient } from "@libsql/client";

const [form, jsonPath] = process.argv.slice(2);
const DRY_RUN = process.argv.includes("--dry-run");

const SUBJECT = "Science";

// Each paper's chapter headings, verbatim.
const PAPERS = {
  1: {
    paper: "Sains Tingkatan 1 / Science Form 1 — 100 Soalan Objektif",
    chapters: {
      1: "Pengenalan kepada Penyiasatan Saintifik / Chapter 1: Introduction to Scientific Investigation",
      2: "Sel sebagai Unit Asas Kehidupan / Chapter 2: Cell as the Basic Unit of Life",
      3: "Koordinasi dan Gerak Balas / Chapter 3: Coordination and Response",
      4: "Pembiakan / Chapter 4: Reproduction",
      5: "Jirim / Chapter 5: Matter",
      6: "Jadual Berkala / Chapter 6: The Periodic Table",
      7: "Udara / Chapter 7: Air",
      8: "Cahaya dan Optik / Chapter 8: Light and Optics",
      9: "Bumi / Chapter 9: The Earth",
    },
  },
  2: {
    paper: "Sains Tingkatan 2 / Science Form 2 — 100 Soalan Objektif",
    chapters: {
      1: "Biodiversiti / Chapter 1: Biodiversity",
      2: "Ekosistem / Chapter 2: Ecosystem",
      3: "Nutrisi / Chapter 3: Nutrition",
      4: "Kesihatan Manusia / Chapter 4: Human Health",
      5: "Air dan Larutan / Chapter 5: Water and Solution",
      6: "Asid dan Alkali / Chapter 6: Acid and Alkali",
      7: "Keelektrikan dan Kemagnetan / Chapter 7: Electricity and Magnetism",
      8: "Daya dan Gerakan / Chapter 8: Force and Motion",
      9: "Haba / Chapter 9: Heat",
      10: "Gelombang Bunyi / Chapter 10: Sound Waves",
      11: "Bintang dan Galaksi dalam Alam Semesta / Chapter 11: Stars and Galaxies in the Universe",
      12: "Sistem Suria / Chapter 12: Solar System",
      13: "Meteoroid, Asteroid, Komet / Chapter 13: Meteoroids, Asteroids and Comets",
    },
  },
};

if (!PAPERS[form] || !jsonPath) {
  console.error("Usage: node scripts/split-science-chapters.mjs <form: 1|2> <questions.json> [--dry-run]");
  process.exit(1);
}
const { paper: PAPER, chapters: CHAPTERS } = PAPERS[form];
const GRADE = `Form ${form}`;
// Titled like the Sejarah chapter sets ("Bab 1: ..."); students only see
// their own grade's sets, so the grade is not repeated in the title.
const titleOf = (n) => `Bab ${n}: ${CHAPTERS[n]}`;
const DESCRIPTION = `Sains Tingkatan ${form}, soalan objektif dwibahasa. / Form ${form} Science, bilingual objective questions.`;

const parsed = JSON.parse(fs.readFileSync(jsonPath, "utf8"));
const bodyOf = (q) =>
  q.stem
    .map((p) => p.trim())
    .filter(Boolean)
    .join("\n\n");

const db = createClient({
  url: process.env.TURSO_DATABASE_URL.replace(/^libsql:\/\//, "https://"),
  authToken: process.env.TURSO_AUTH_TOKEN,
});
const id = () => crypto.randomUUID();
const iso = (ms) => new Date(ms).toISOString().replace("Z", "+00:00");

const paper = await db.execute({ sql: "SELECT id, createdById FROM QuestionSet WHERE title = ?", args: [PAPER] });
if (paper.rows.length !== 1) throw new Error(`Expected one set called "${PAPER}", found ${paper.rows.length}.`);
const { id: paperId, createdById } = paper.rows[0];

const titles = Object.keys(CHAPTERS).map((n) => titleOf(Number(n)));
const clash = await db.execute({
  sql: `SELECT title FROM QuestionSet WHERE title IN (${titles.map(() => "?").join(",")})`,
  args: titles,
});
if (clash.rows.length) throw new Error(`Chapter sets already exist (${clash.rows[0].title}) - not splitting twice.`);

// Imported a millisecond apart in paper order, so createdAt order is Q1-Q100.
const rows = (
  await db.execute({
    sql: "SELECT id, body FROM Question WHERE questionSetId = ? ORDER BY createdAt, id",
    args: [paperId],
  })
).rows;
if (rows.length !== parsed.length) throw new Error(`Set has ${rows.length} questions; the paper has ${parsed.length}.`);

// ---- checks before anything is written --------------------------------------
// A question edited in admin since the import will not match the paper text;
// it is still in its place, so it is reported, not refused.
const edited = [];
for (const [i, q] of parsed.entries()) {
  if (!CHAPTERS[q.chapter]) throw new Error(`Q${q.n} has no chapter.`);
  if (i > 0 && q.chapter < parsed[i - 1].chapter) throw new Error(`Q${q.n} goes back a chapter.`);
  if (rows[i].body !== bodyOf(q)) edited.push(q.n);
}
if (edited.length > 10) throw new Error(`${edited.length} questions differ from the paper - order is not trustworthy.`);

const byChapter = new Map();
for (const [i, q] of parsed.entries()) {
  if (!byChapter.has(q.chapter)) byChapter.set(q.chapter, []);
  byChapter.get(q.chapter).push(rows[i].id);
}
for (const [n, ids] of byChapter) {
  const first = parsed.findIndex((q) => q.chapter === n) + 1;
  console.log(`${titleOf(n)}  -  Q${first}-Q${first + ids.length - 1} (${ids.length})`);
}
if (edited.length) console.log(`\nedited since import (text differs, position kept): Q${edited.join(", Q")}`);

if (DRY_RUN) process.exit(0);

// ---- split ------------------------------------------------------------------
const base = Date.now();
const count = byChapter.size;
const statements = [];
for (const [n, ids] of byChapter) {
  // Bab 1 newest, so the newest-first list reads in chapter order.
  const at = iso(base + (count - n));
  let setId;
  if (n === 1) {
    setId = paperId;
    statements.push({
      sql: "UPDATE QuestionSet SET title = ?, description = ?, createdAt = ?, updatedAt = ? WHERE id = ?",
      args: [titleOf(n), DESCRIPTION, at, iso(base), setId],
    });
  } else {
    setId = id();
    statements.push(
      {
        // Bilingual like the paper, so the BM / English switch carries over.
        sql: `INSERT INTO QuestionSet (id, title, description, subject, isActive, createdAt, updatedAt, createdById, bilingual)
              VALUES (?, ?, ?, ?, 1, ?, ?, ?, 1)`,
        args: [setId, titleOf(n), DESCRIPTION, SUBJECT, at, at, createdById],
      },
      {
        sql: "INSERT INTO QuestionSetGrade (id, questionSetId, grade, createdAt) VALUES (?, ?, ?, ?)",
        args: [id(), setId, GRADE, at],
      },
    );
  }
  statements.push({
    sql: `UPDATE Question SET questionSetId = ? WHERE id IN (${ids.map(() => "?").join(",")})`,
    args: [setId, ...ids],
  });
}

// All or nothing.
await db.batch(statements, "write");
console.log(`\nsplit into ${count} sets`);
