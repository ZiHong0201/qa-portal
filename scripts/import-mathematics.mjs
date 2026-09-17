// One-time import: parses the SPM Mathematics 2026 Trial K1 "by topic" docx
// directly from its OOXML (same approach as scripts/import-chemistry.mjs) and
// loads it into the DB as one QuestionSet per topic, shared with Form 4 and
// Form 5. Each embedded diagram is matched to the question whose stem it
// immediately follows (before that question's first answer option) and
// uploaded to Vercel Blob as the question's diagramUrl.
//
// Differences from the Chemistry import, found while inspecting this file:
// - Four topics are named "Consumer Mathematics: <something>". The Chemistry
//   topic pattern had no colon in its character class, so those four headers
//   were skipped and their 58 questions were silently absorbed into the
//   preceding topic. The pattern here anchors on the "(N questions)" suffix
//   instead of trying to enumerate the legal characters of a topic name.
// - This docx's zip entries use backslashes. Rather than guessing, entries
//   are looked up by regex over the entry names, which works either way.
// - There are no <w:br/> line breaks in this document, but the handling is
//   kept so a stem split across breaks would still import correctly.
//
// Pass --dry-run to parse and report without touching the database or Blob.
//
// Usage: node scripts/import-mathematics.mjs [--dry-run]
import "dotenv/config";
import JSZip from "jszip";
import fs from "fs";
import crypto from "crypto";
import { createClient } from "@libsql/client";
import { put } from "@vercel/blob";

const DOCX_PATH =
  "C:/Users/User/Downloads/MATHEMATICS-Trial SPM 2026/MATHEMATICS-Trial SPM 2026/SPM_Mathematics_2026_Trial_K1_by_Topic.docx";
const SUBJECT = "Mathematics";
const GRADES = ["Form 4", "Form 5"];
const PAPER_COUNT = 14;
const PICTURE_OPTION_PATTERN =
  /^(Image|Graph|Diagram|Curve|Plot|Structure|Picture|Figure|Table)\b/i;

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

// Zip entry names use backslashes in this file and forward slashes in others,
// so match on the name rather than assuming a separator.
function findEntry(zip, re) {
  const name = Object.keys(zip.files).find((n) => re.test(n));
  return name ? zip.file(name) : null;
}

async function parseDocx() {
  const zip = await JSZip.loadAsync(fs.readFileSync(DOCX_PATH));
  const documentXml = await findEntry(zip, /word[\\/]document\.xml$/).async("string");
  const relsXml = await findEntry(zip, /word[\\/]_rels[\\/]document\.xml\.rels$/).async("string");

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

  const sections = [];
  let currentSection = null;
  let currentQuestion = null;
  let seenOptionSinceQuestion = true;

  for (const p of paragraphs) {
    // Anchored on the "(N questions)" suffix, so a topic name containing a
    // colon, ampersand or anything else still registers as a header.
    const topicM = p.text.match(/^(.+?)\s*\((\d+) questions?\)$/);
    const questionM = p.text.match(/^(.+?) \u2014 Question (\d+)$/);
    const optionM = p.text.match(/^([A-D])\.\s*(.*)$/s);
    const answerM = p.text.match(/^Answer:\s*([A-Z])$/);

    if (topicM) {
      currentSection = {
        topic: topicM[1].trim(),
        expectedCount: Number(topicM[2]),
        questions: [],
      };
      sections.push(currentSection);
      currentQuestion = null;
    } else if (questionM && currentSection) {
      currentQuestion = {
        label: `${questionM[1].trim()} ${questionM[2]}`,
        stemLines: [],
        options: [],
        answerLetter: null,
        diagramRelId: null,
      };
      currentSection.questions.push(currentQuestion);
      seenOptionSinceQuestion = false;
    } else if (optionM && currentQuestion) {
      currentQuestion.options.push({ letter: optionM[1], text: optionM[2].trim() });
      seenOptionSinceQuestion = true;
    } else if (answerM && currentQuestion) {
      currentQuestion.answerLetter = answerM[1];
    } else if (p.text && currentQuestion && !seenOptionSinceQuestion && !answerM) {
      currentQuestion.stemLines.push(p.text);
    }

    if (p.relId && currentQuestion && !seenOptionSinceQuestion) {
      currentQuestion.diagramRelId = p.relId;
    }
  }

  return { sections, relMap, zip };
}

async function uploadDiagram(zip, mediaName) {
  const entry = findEntry(zip, new RegExp(`media[\\\\/]${mediaName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`));
  const buf = await entry.async("nodebuffer");
  const pathname = `questions/${crypto.randomUUID()}.png`;
  const blob = await put(pathname, buf, { access: "public", contentType: "image/png" });
  return blob.url;
}

async function main() {
  const { sections, relMap, zip } = await parseDocx();
  for (const sec of sections) {
    for (const q of sec.questions) {
      q.diagramName = q.diagramRelId ? relMap[q.diagramRelId] : null;
    }
  }

  const totalParsed = sections.reduce((s, sec) => s + sec.questions.length, 0);
  const totalDeclared = sections.reduce((s, sec) => s + sec.expectedCount, 0);
  console.log(
    `Parsed ${totalParsed} questions across ${sections.length} topics (document declares ${totalDeclared}).`
  );

  // A topic whose parsed count differs from its own header is the signal that
  // a header or a question was mis-detected, so report it rather than importing
  // a set that quietly has the wrong questions in it.
  const mismatched = sections.filter((s) => s.questions.length !== s.expectedCount);
  if (mismatched.length) {
    console.log(`\nTopics whose parsed count differs from the declared count:`);
    for (const s of mismatched) {
      console.log(`  ${s.topic}: parsed ${s.questions.length}, declared ${s.expectedCount}`);
    }
  } else {
    console.log("Every topic matches its declared question count.");
  }

  const skipped = [];
  for (const sec of sections) {
    sec.questions = sec.questions.filter((q) => {
      const ok =
        q.options.length >= 2 &&
        q.answerLetter &&
        q.options.some((o) => o.letter === q.answerLetter);
      if (!ok) skipped.push(`${sec.topic} / ${q.label}`);
      return ok;
    });
  }
  if (skipped.length) {
    console.log(`\nSkipping ${skipped.length} question(s) with no valid answer key:`);
    skipped.forEach((s) => console.log(`  ${s}`));
  }

  let simplifiedCount = 0;
  for (const sec of sections) {
    for (const q of sec.questions) {
      if (q.diagramName && q.options.every((o) => PICTURE_OPTION_PATTERN.test(o.text))) {
        q.options = q.options.map((o) => ({ ...o, text: o.letter }));
        simplifiedCount++;
      }
    }
  }
  console.log(`\nSimplified ${simplifiedCount} question(s) whose diagram already shows all options.`);

  const importable = sections.reduce((s, sec) => s + sec.questions.length, 0);
  const withDiagram = sections.reduce(
    (s, sec) => s + sec.questions.filter((q) => q.diagramName).length,
    0
  );
  console.log(`Ready to import: ${importable} questions, ${withDiagram} with diagrams.`);

  if (DRY_RUN) {
    console.log("\n--- dry run, nothing written ---");
    for (const sec of sections) {
      console.log(`  ${String(sec.questions.length).padStart(3)}  ${sec.topic}`);
    }
    const sample = sections.find((s) => s.questions.length)?.questions[0];
    if (sample) {
      console.log("\nSample question:");
      console.log("  label:", sample.label);
      console.log("  stem:", sample.stemLines.join(" | ").slice(0, 200));
      sample.options.forEach((o) =>
        console.log(`   ${o.letter === sample.answerLetter ? "*" : " "}${o.letter}. ${o.text}`)
      );
    }
    return;
  }

  const admin = await db.execute("SELECT id FROM User WHERE role = 'ADMIN' LIMIT 1");
  const adminId = admin.rows[0].id;
  const now = new Date().toISOString();

  let setsCreated = 0;
  let questionsCreated = 0;
  let diagramsUploaded = 0;

  for (const sec of sections) {
    if (sec.questions.length === 0) continue;

    const setId = crypto.randomUUID();
    await db.execute({
      sql: `INSERT INTO QuestionSet (id, title, description, subject, isActive, createdAt, updatedAt, createdById)
            VALUES (?, ?, ?, ?, 1, ?, ?, ?)`,
      args: [
        setId,
        sec.topic,
        `SPM Mathematics 2026 Trial Kertas 1 questions on ${sec.topic}, compiled from ${PAPER_COUNT} state trial papers.`,
        SUBJECT,
        now,
        now,
        adminId,
      ],
    });
    for (const grade of GRADES) {
      await db.execute({
        sql: `INSERT INTO QuestionSetGrade (id, questionSetId, grade, createdAt) VALUES (?, ?, ?, ?)`,
        args: [crypto.randomUUID(), setId, grade, now],
      });
    }
    setsCreated++;

    for (const q of sec.questions) {
      let diagramUrl = null;
      if (q.diagramName) {
        diagramUrl = await uploadDiagram(zip, q.diagramName);
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
    console.log(`[${setsCreated}] ${sec.topic} - ${sec.questions.length} questions`);
  }

  console.log(
    `\nDone. ${setsCreated} sets, ${questionsCreated} questions, ${diagramsUploaded} diagrams uploaded.`
  );
}

main();
