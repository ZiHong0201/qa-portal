// One-time import: loads the SPM Sejarah 2026 Trial K1 "by topic" chapter
// files into the DB as one QuestionSet per chapter.
//
// The subject is deliberately stored as "Sejarah", not "History" - that is
// what the paper is called and what the students sit.
//
// Differences from the Chemistry/Mathematics imports:
// - The source is 20 separate .docx files (one per chapter) rather than one
//   combined document, and each file names its own form and chapter in its
//   header line ("Form 4, Chapter 1 - National Heritage"). That is read from
//   the document rather than inferred from the filename, and it means each
//   set is tied to a single grade instead of being shared across two.
// - 40 questions carry a "Note: Answer scheme for Selangor (Set 2) is
//   mismatched..." paragraph sitting BETWEEN the question header and the
//   stem. Left alone it would be imported as the first line of the question
//   body and shown to students as part of the question. Those paragraphs are
//   stripped from the stem and reported instead, because they are a caveat
//   for the teacher about the answer key, not part of the question.
// - The questions are in Malay and are imported verbatim.
//
// Pass --dry-run to parse and report without touching the database or Blob.
//
// Usage: node scripts/import-sejarah.mjs [--dry-run]
import "dotenv/config";
import JSZip from "jszip";
import fs from "fs";
import path from "path";
import crypto from "crypto";
import { createClient } from "@libsql/client";
import { put } from "@vercel/blob";

const DIR = "C:/Users/User/Downloads/SEJARAH-Trial SPM 2026/K1 By Topic";
const SUBJECT = "Sejarah";
const PICTURE_OPTION_PATTERN =
  /^(Image|Graph|Diagram|Curve|Plot|Structure|Picture|Figure|Table|Gambar|Rajah|Jadual)\b/i;

// Paragraphs that are editorial notes about the answer key rather than part of
// the question. Kept out of the question body and reported at the end.
const SCHEME_NOTE_PATTERN = /^Note: Answer scheme/i;

const DRY_RUN = process.argv.includes("--dry-run");

const db = DRY_RUN
  ? null
  : createClient({
      url: process.env.TURSO_DATABASE_URL,
      authToken: process.env.TURSO_AUTH_TOKEN,
    });

function decodeXmlEntities(s) {
  return s
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/&amp;/g, "&");
}

function findEntry(zip, re) {
  const name = Object.keys(zip.files).find((n) => re.test(n));
  return name ? zip.file(name) : null;
}

async function parseChapter(file) {
  const zip = await JSZip.loadAsync(fs.readFileSync(file));
  const documentXml = await findEntry(zip, /word[\\/]document\.xml$/).async("string");
  const relsEntry = findEntry(zip, /word[\\/]_rels[\\/]document\.xml\.rels$/);
  const relsXml = relsEntry ? await relsEntry.async("string") : "";

  const relMap = {};
  for (const m of relsXml.matchAll(/<Relationship Id="(rId\d+)"[^>]*Target="media\/([^"]+)"/g)) {
    relMap[m[1]] = m[2];
  }

  const paragraphs = [];
  for (const pm of documentXml.matchAll(/<w:p[ >][\s\S]*?<\/w:p>/g)) {
    const pXml = pm[0];
    let text = "";
    for (const tm of pXml.matchAll(/<w:t[^>]*>([^<]*)<\/w:t>|<w:br\s*\/?>/g)) {
      text += tm[1] !== undefined ? decodeXmlEntities(tm[1]) : "\n";
    }
    const imgMatch = pXml.match(/r:embed="(rId\d+)"/);
    paragraphs.push({ text: text.trim(), relId: imgMatch ? imgMatch[1] : null });
  }

  const nonEmpty = paragraphs.filter((p) => p.text);
  const headerM = nonEmpty
    .slice(0, 5)
    .map((p) => p.text.match(/^Form (\d+), Chapter (\d+)\s*[\u2014-]\s*(.+)$/))
    .find(Boolean);
  if (!headerM) throw new Error(`No "Form N, Chapter M - Title" header found in ${file}`);

  const chapter = {
    grade: `Form ${headerM[1]}`,
    chapterNo: Number(headerM[2]),
    title: headerM[3].trim(),
    expectedCount: null,
    questions: [],
    relMap,
    zip,
  };

  let currentQuestion = null;
  let seenOptionSinceQuestion = true;

  for (const p of paragraphs) {
    const topicM = p.text.match(/^(.+?)\s*\((\d+) questions?\)$/);
    const questionM = p.text.match(/^(.+?) \u2014 Question (\d+)$/);
    const optionM = p.text.match(/^([A-D])\.\s*(.*)$/s);
    const answerM = p.text.match(/^Answer:\s*([A-Z])$/);

    if (questionM) {
      currentQuestion = {
        label: `${questionM[1].trim()} ${questionM[2]}`,
        stemLines: [],
        options: [],
        answerLetter: null,
        diagramRelId: null,
        schemeNote: null,
      };
      chapter.questions.push(currentQuestion);
      seenOptionSinceQuestion = false;
    } else if (topicM && !currentQuestion) {
      chapter.expectedCount = Number(topicM[2]);
    } else if (optionM && currentQuestion) {
      currentQuestion.options.push({ letter: optionM[1], text: optionM[2].trim() });
      seenOptionSinceQuestion = true;
    } else if (answerM && currentQuestion) {
      currentQuestion.answerLetter = answerM[1];
    } else if (p.text && currentQuestion && !seenOptionSinceQuestion) {
      // Editorial note about the answer key - never part of the question.
      if (SCHEME_NOTE_PATTERN.test(p.text)) currentQuestion.schemeNote = p.text;
      else currentQuestion.stemLines.push(p.text);
    }

    if (p.relId && currentQuestion && !seenOptionSinceQuestion) {
      currentQuestion.diagramRelId = p.relId;
    }
  }

  return chapter;
}

async function uploadDiagram(zip, mediaName) {
  const entry = findEntry(
    zip,
    new RegExp(`media[\\\\/]${mediaName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`)
  );
  const buf = await entry.async("nodebuffer");
  const ext = (mediaName.split(".").pop() || "png").toLowerCase();
  const contentType = ext === "jpg" || ext === "jpeg" ? "image/jpeg" : `image/${ext}`;
  const pathname = `questions/${crypto.randomUUID()}.${ext}`;
  const blob = await put(pathname, buf, { access: "public", contentType });
  return blob.url;
}

async function main() {
  const files = fs
    .readdirSync(DIR)
    .filter((f) => f.toLowerCase().endsWith(".docx"))
    .sort();

  const chapters = [];
  for (const f of files) {
    chapters.push(await parseChapter(path.join(DIR, f)));
  }

  for (const ch of chapters) {
    for (const q of ch.questions) {
      q.diagramName = q.diagramRelId ? ch.relMap[q.diagramRelId] : null;
    }
  }

  const totalParsed = chapters.reduce((s, c) => s + c.questions.length, 0);
  console.log(`Parsed ${totalParsed} questions across ${chapters.length} chapters.`);

  const mismatched = chapters.filter(
    (c) => c.expectedCount !== null && c.questions.length !== c.expectedCount
  );
  if (mismatched.length) {
    console.log("\nChapters whose parsed count differs from the declared count:");
    for (const c of mismatched) {
      console.log(`  ${c.title}: parsed ${c.questions.length}, declared ${c.expectedCount}`);
    }
  } else {
    console.log("Every chapter matches its declared question count.");
  }

  const skipped = [];
  for (const ch of chapters) {
    ch.questions = ch.questions.filter((q) => {
      const ok =
        q.stemLines.length > 0 &&
        q.options.length >= 2 &&
        q.answerLetter &&
        q.options.some((o) => o.letter === q.answerLetter);
      if (!ok) skipped.push(`${ch.title} / ${q.label}`);
      return ok;
    });
  }
  if (skipped.length) {
    console.log(`\nSkipping ${skipped.length} question(s) with no usable stem or answer key:`);
    skipped.forEach((s) => console.log(`  ${s}`));
  }

  let simplified = 0;
  for (const ch of chapters) {
    for (const q of ch.questions) {
      if (q.diagramName && q.options.every((o) => PICTURE_OPTION_PATTERN.test(o.text))) {
        q.options = q.options.map((o) => ({ ...o, text: o.letter }));
        simplified++;
      }
    }
  }

  const noted = chapters.flatMap((ch) =>
    ch.questions.filter((q) => q.schemeNote).map((q) => ({ ch, q }))
  );
  const withDiagram = chapters.reduce(
    (s, c) => s + c.questions.filter((q) => q.diagramName).length,
    0
  );
  const importable = chapters.reduce((s, c) => s + c.questions.length, 0);

  console.log(`\nSimplified ${simplified} question(s) whose diagram already shows all options.`);
  console.log(`Stripped answer-scheme notes from ${noted.length} question stem(s).`);
  console.log(`Ready to import: ${importable} questions, ${withDiagram} with diagrams.`);

  if (DRY_RUN) {
    console.log("\n--- dry run, nothing written ---");
    for (const ch of chapters) {
      console.log(
        `  ${ch.grade}  Ch ${String(ch.chapterNo).padStart(2)}  ${String(ch.questions.length).padStart(3)}q  ${ch.title}`
      );
    }
    const sample = chapters[0].questions[0];
    console.log("\nSample question:");
    console.log("  label:", sample.label);
    console.log("  stem:", sample.stemLines.join(" | ").slice(0, 200));
    sample.options.forEach((o) =>
      console.log(`   ${o.letter === sample.answerLetter ? "*" : " "}${o.letter}. ${o.text}`)
    );

    console.log(`\nQuestions whose answer came from subject knowledge, not the official scheme:`);
    for (const { ch, q } of noted) {
      const low = /lower-confidence/.test(q.schemeNote) ? "  [LOW CONFIDENCE]" : "";
      console.log(`  ${ch.grade} Ch${ch.chapterNo} - ${q.label}${low}`);
    }
    return;
  }

  const admin = await db.execute("SELECT id FROM User WHERE role = 'ADMIN' LIMIT 1");
  const adminId = admin.rows[0].id;
  const now = new Date().toISOString();

  // The subject must exist in master data or it cannot be assigned to students.
  const existing = await db.execute({
    sql: `SELECT id FROM Subject WHERE name = ?`,
    args: [SUBJECT],
  });
  if (existing.rows.length === 0) {
    await db.execute({
      sql: `INSERT INTO Subject (id, name, createdAt) VALUES (?, ?, ?)`,
      args: [crypto.randomUUID(), SUBJECT, now],
    });
    console.log(`Added "${SUBJECT}" to the subject master data.`);
  }

  let setsCreated = 0;
  let questionsCreated = 0;
  let diagramsUploaded = 0;

  for (const ch of chapters) {
    if (ch.questions.length === 0) continue;

    const setId = crypto.randomUUID();
    const title = `Chapter ${ch.chapterNo}: ${ch.title}`;
    await db.execute({
      sql: `INSERT INTO QuestionSet (id, title, description, subject, isActive, createdAt, updatedAt, createdById)
            VALUES (?, ?, ?, ?, 1, ?, ?, ?)`,
      args: [
        setId,
        title,
        `Soalan Kertas 1 SPM Sejarah 2026 (percubaan negeri) bagi ${ch.grade} Bab ${ch.chapterNo}: ${ch.title}.`,
        SUBJECT,
        now,
        now,
        adminId,
      ],
    });
    await db.execute({
      sql: `INSERT INTO QuestionSetGrade (id, questionSetId, grade, createdAt) VALUES (?, ?, ?, ?)`,
      args: [crypto.randomUUID(), setId, ch.grade, now],
    });
    setsCreated++;

    for (const q of ch.questions) {
      let diagramUrl = null;
      if (q.diagramName) {
        diagramUrl = await uploadDiagram(ch.zip, q.diagramName);
        diagramsUploaded++;
      }

      const questionId = crypto.randomUUID();
      await db.execute({
        sql: `INSERT INTO Question (id, body, explanation, diagramUrl, type, points, isActive, createdAt, updatedAt, questionSetId, createdById)
              VALUES (?, ?, NULL, ?, 'MULTIPLE_CHOICE', 10, 1, ?, ?, ?, ?)`,
        args: [questionId, q.stemLines.join("\n").trim(), diagramUrl, now, now, setId, adminId],
      });
      let order = 0;
      for (const opt of q.options) {
        await db.execute({
          sql: `INSERT INTO Choice (id, text, isCorrect, "order", questionId) VALUES (?, ?, ?, ?, ?)`,
          args: [
            crypto.randomUUID(),
            opt.text,
            opt.letter === q.answerLetter ? 1 : 0,
            order,
            questionId,
          ],
        });
        order++;
      }
      questionsCreated++;
    }
    console.log(`[${setsCreated}/${chapters.length}] ${ch.grade} ${title} - ${ch.questions.length} questions`);
  }

  console.log(
    `\nDone. ${setsCreated} sets, ${questionsCreated} questions, ${diagramsUploaded} diagrams uploaded.`
  );
  console.log(
    `\n${noted.length} question(s) carry an answer taken from subject knowledge rather than the official scheme (${noted.filter((n) => /lower-confidence/.test(n.q.schemeNote)).length} flagged low-confidence in the source). Their notes were kept out of the question text.`
  );
}

main();
