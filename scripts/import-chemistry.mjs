// One-time import: parses the SPM Chemistry 2026 Trial K1 "by topic" docx
// directly from its OOXML (same approach as scripts/import-biology.mjs) and
// loads it into the DB as one QuestionSet per topic, shared with Form 4 and
// Form 5. Each embedded diagram is matched to the question whose stem it
// immediately follows (before that question's first answer option) and
// uploaded to Vercel Blob as the question's diagramUrl.
//
// Differences from the Biology import, found while inspecting this file:
// - This docx's zip uses forward slashes (Biology's used backslashes for
//   reasons never fully explained - handled here by trying both).
// - Some state labels contain parentheses, e.g. "Selangor (Set 1)",
//   "Johor (Batu Pahat)" - the question-header pattern allows any label
//   text instead of just letters/spaces.
// - Some multi-part stems (I/II/III/IV sub-statements) use a <w:br/> line
//   break inside a single paragraph rather than separate paragraphs -
//   those are now turned into "\n" during text extraction.
// - A handful of questions have all four options already fully depicted in
//   the attached diagram (e.g. four labelled graphs A-D) - those are
//   collapsed to bare letter choices instead of repeating the long
//   description as choice text, matching the same fix applied to Biology's
//   equivalent cases.
// - One question (Perlis 16) has no answer key in the source and is
//   skipped.
//
// Usage: node scripts/import-chemistry.mjs
import "dotenv/config";
import JSZip from "jszip";
import fs from "fs";
import crypto from "crypto";
import { createClient } from "@libsql/client";
import { put } from "@vercel/blob";

const DOCX_PATH =
  "C:/Users/User/Downloads/CHEMISTRY-Trial SPM 2026/SPM_Chemistry_2026_Trial_K1_by_Topic.docx";
const SUBJECT = "Chemistry";
const GRADES = ["Form 4", "Form 5"];
const PICTURE_OPTION_PATTERN = /^(Image|Graph|Diagram|Curve|Plot|Structure|Picture)\b/i;

const db = createClient({
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

async function parseDocx() {
  const buf = fs.readFileSync(DOCX_PATH);
  const zip = await JSZip.loadAsync(buf);
  const zf = (fwd, back) => zip.file(fwd) ?? zip.file(back);
  const documentXml = await zf("word/document.xml", "word\\document.xml").async("string");
  const relsXml = await zf(
    "word/_rels/document.xml.rels",
    "word\\_rels\\document.xml.rels"
  ).async("string");
  const sep = zip.file("word/document.xml") ? "/" : "\\";

  const relMap = {};
  for (const m of relsXml.matchAll(/<Relationship Id="(rId\d+)"[^>]*Target="media\/([^"]+)"/g)) {
    relMap[m[1]] = `word${sep}media${sep}` + m[2];
  }

  const paraRe = /<w:p[ >][\s\S]*?<\/w:p>/g;
  const paragraphs = [];
  for (const pm of documentXml.matchAll(paraRe)) {
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
    const topicM = p.text.match(/^([A-Z][A-Za-z0-9 ,'/\-()]+?)\s*\((\d+) questions?\)$/);
    const questionM = p.text.match(/^(.+?) \u2014 Question (\d+)$/);
    const optionM = p.text.match(/^([A-D])\.\s*(.*)$/s);
    const answerM = p.text.match(/^Answer:\s*([A-Z])$/);

    if (topicM) {
      currentSection = { topic: topicM[1].trim(), expectedCount: Number(topicM[2]), questions: [] };
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

async function uploadDiagram(zip, mediaPath) {
  const buf = await zip.file(mediaPath).async("nodebuffer");
  const pathname = `questions/${crypto.randomUUID()}.png`;
  const blob = await put(pathname, buf, { access: "public", contentType: "image/png" });
  return blob.url;
}

async function main() {
  const { sections, relMap, zip } = await parseDocx();
  for (const sec of sections) {
    for (const q of sec.questions) {
      q.diagramPath = q.diagramRelId ? relMap[q.diagramRelId] : null;
    }
  }
  const totalQuestions = sections.reduce((s, sec) => s + sec.questions.length, 0);
  console.log(`Parsed ${totalQuestions} questions across ${sections.length} topics.`);

  const skipped = [];
  for (const sec of sections) {
    sec.questions = sec.questions.filter((q) => {
      const ok = q.options.length >= 2 && q.answerLetter && q.options.some((o) => o.letter === q.answerLetter);
      if (!ok) skipped.push(q.label);
      return ok;
    });
  }
  if (skipped.length) {
    console.log(`Skipping ${skipped.length} question(s) with no valid answer key:`, skipped);
  }

  let simplifiedCount = 0;
  for (const sec of sections) {
    for (const q of sec.questions) {
      if (q.diagramPath && q.options.every((o) => PICTURE_OPTION_PATTERN.test(o.text))) {
        q.options = q.options.map((o) => ({ ...o, text: o.letter }));
        simplifiedCount++;
      }
    }
  }
  console.log(`Simplified ${simplifiedCount} question(s) whose diagram already shows all options.`);

  const admin = await db.execute("SELECT id FROM User WHERE role = 'ADMIN' LIMIT 1");
  const adminId = admin.rows[0].id;
  const now = new Date().toISOString();

  let setsCreated = 0;
  let questionsCreated = 0;
  let diagramsUploaded = 0;

  for (const sec of sections) {
    const setId = crypto.randomUUID();
    await db.execute({
      sql: `INSERT INTO QuestionSet (id, title, description, subject, isActive, createdAt, updatedAt, createdById)
            VALUES (?, ?, ?, ?, 1, ?, ?, ?)`,
      args: [
        setId,
        sec.topic,
        `SPM Chemistry 2026 Trial Kertas 1 questions on ${sec.topic}, compiled from 12 state trial papers.`,
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
      if (q.diagramPath) {
        diagramUrl = await uploadDiagram(zip, q.diagramPath);
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
          args: [crypto.randomUUID(), opt.text, opt.letter === q.answerLetter ? 1 : 0, order, questionId],
        });
        order++;
      }
      questionsCreated++;
    }
    console.log(`[${setsCreated}/${sections.length}] ${sec.topic} - ${sec.questions.length} questions`);
  }

  console.log(
    `\nDone. ${setsCreated} sets, ${questionsCreated} questions, ${diagramsUploaded} diagrams uploaded.`
  );
}

main();
