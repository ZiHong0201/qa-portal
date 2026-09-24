// Imports the SPM English Kertas 1 trial papers into the portal, one
// QuestionSet per state paper.
//
// Unlike the Chemistry/Sejarah imports, nothing here is parsed from a source
// file: these papers are flat scans with no text layer, so the questions were
// transcribed by hand into scripts/english-k1/<state>.mjs and this script only
// moves that data into the database. What it does own is the Part 1 pictures,
// which are cropped out of the PDF by scripts/crop_english_stimuli.py and
// written into public/ so each question can show its own poster or screenshot.
//
// Two rules keep a mis-detected crop from being imported silently:
//   - the number of crops, after the known non-stimulus bands are skipped,
//     must equal the number of Part 1 questions; and
//   - every Part 1 question must end up with a URL.
// Either failing aborts the whole state. A picture attached to the wrong
// question is worse than no import: the question still reads plausibly, so
// nobody would notice until a student did.
//
// Usage:
//   node scripts/import-english-k1.mjs --dry-run          # parse and report
//   node scripts/import-english-k1.mjs                    # every state
//   node scripts/import-english-k1.mjs kedah perlis       # named states
import "dotenv/config";
import fs from "fs";
import path from "path";
import crypto from "crypto";
import { execFileSync } from "child_process";
import { fileURLToPath, pathToFileURL } from "url";
import sharp from "sharp";
import { createClient } from "@libsql/client";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(HERE, "english-k1");
const SUBJECT = "English";
const GRADE = "Form 5";
const POINTS = 10; // the portal's flat rate; every other question uses it too

const DRY_RUN = process.argv.includes("--dry-run");
const wanted = process.argv.slice(2).filter((a) => !a.startsWith("--"));

const db = DRY_RUN
  ? null
  : createClient({
      url: process.env.TURSO_DATABASE_URL,
      authToken: process.env.TURSO_AUTH_TOKEN,
    });

const id = () => crypto.randomUUID();
const now = () => new Date().toISOString();

/** Crops the Part 1 stimuli and returns their file paths, in question order. */
function cropStimuli(paper, outDir) {
  fs.rmSync(outDir, { recursive: true, force: true });
  execFileSync(
    "python",
    [
      path.join(HERE, "crop_english_stimuli.py"),
      paper.pdf,
      outDir,
      ...paper.stimulusPages.map(String),
    ],
    { stdio: "inherit" }
  );

  const bands = JSON.parse(fs.readFileSync(path.join(outDir, "bands.json"), "utf8"));
  const skip = new Set(paper.stimulusSkip ?? []);
  return bands
    .filter((b) => !skip.has(b.file.replace(/\.png$/, "")))
    .map((b) => path.join(outDir, b.file));
}

/**
 * Puts one stimulus where the app can serve it, and returns its URL.
 *
 * These live in public/ rather than in Blob, which is where the Physics
 * diagrams went. Two reasons. They are exam scans that will never be edited,
 * so the thing Blob buys - changing an image without a deploy - is worth
 * nothing here; and it keeps the import runnable by anyone with the repo,
 * rather than only by someone holding a read-write token.
 *
 * `diagramUrl` is only a string, so moving these to Blob later is an upload
 * and one UPDATE, not a re-import.
 *
 * The recompression is not housekeeping. A 200 DPI crop of a black-and-white
 * scan is about 260 KB as pdftoppm writes it and about 70 KB as sixteen greys,
 * with no visible loss, and the difference is eight images a student loads on
 * a phone between questions.
 */
async function saveStimulus(file, state, questionNumber) {
  const dir = path.join(HERE, "..", "public", "questions", "english", state);
  fs.mkdirSync(dir, { recursive: true });

  const name = `q${String(questionNumber).padStart(2, "0")}.png`;
  await sharp(file)
    .greyscale()
    .png({ palette: true, colours: 16, compressionLevel: 9 })
    .toFile(path.join(dir, name));

  return `/questions/english/${state}/${name}`;
}

/**
 * Builds the text a student reads for one question.
 *
 * `context` is the shared passage a part hangs on. It goes above the stem,
 * separated by a rule, because the reader needs to know where the extract ends
 * and the question begins - without it the two run together into one wall of
 * prose on a phone.
 */
function renderBody(q) {
  if (!q.context) return q.body;
  return `${q.context}\n\n──────────\n\n${q.body}`;
}

/**
 * The set description a student sees above the questions.
 *
 * Two of the fifteen papers - Kuala Lumpur and Sarawak - arrived without a
 * usable answer key: Sarawak has no scheme file at all, and KL's is for a
 * different paper ("Modul KL TOP 5", whose questions are about the Japanese
 * writing system and Leo Clubs rather than this paper's virus notice and
 * Shaolin Temple). Their answers are worked out from the questions instead.
 *
 * That is said on the set rather than kept in a comment here. A student
 * revising has a right to know that a mark against their answer is a reading
 * of the question and not the board's own key.
 */
function describe(paper) {
  if (paper.keySource !== "derived") return paper.description;
  return `${paper.description}

Note: no official answer scheme was issued with this paper, so the answers here are worked out from the questions themselves. Check anything that looks wrong with your teacher.`;
}

async function importPaper(state) {
  const mod = await import(pathToFileURL(path.join(DATA_DIR, `${state}.mjs`)).href);
  const paper = mod.default;

  const part1 = paper.questions.filter((q) => q.part === 1);

  // Part 1 is not laid out the same way in every state. Kedah prints a picture
  // beside each question - an advertisement, a chat screenshot, a poster - so
  // those are cropped from the PDF. Johor prints a bordered box of text, which
  // is transcribed into the question instead, because text reflows on a phone
  // and a scan of a paragraph does not. A paper declares which it is by having
  // stimulusPages or not.
  const outDir = path.join(HERE, "..", ".english-crops", state);
  const crops = paper.stimulusPages ? cropStimuli(paper, outDir) : [];

  if (paper.stimulusPages && crops.length !== part1.length) {
    throw new Error(
      `${state}: found ${crops.length} stimulus crops for ${part1.length} Part 1 questions. ` +
        `Check the band split in ${outDir}/bands.json and adjust stimulusSkip before retrying.`
    );
  }

  console.log(`\n${paper.title}`);
  console.log(
    `  ${paper.questions.length} questions, ` +
      (paper.stimulusPages ? `${crops.length} Part 1 pictures` : "Part 1 stimuli as text")
  );

  if (paper.keySource === "derived") {
    console.log("  ! no official scheme for this paper - answers are derived");
  }

  const keyNotes = paper.questions.filter((q) => q.keyNote);
  for (const q of keyNotes) console.log(`  ! Q${q.n}: ${q.keyNote}`);

  if (DRY_RUN) {
    const byPart = {};
    for (const q of paper.questions) byPart[q.part] = (byPart[q.part] ?? 0) + 1;
    console.log(`  parts: ${Object.entries(byPart).map(([p, n]) => `${p}=${n}`).join(" ")}`);
    console.log(`  free response: ${paper.questions.filter((q) => q.type === "FREE").length}`);
    return { set: null, notes: keyNotes };
  }

  const admin = await db.execute("SELECT id FROM User WHERE role = 'ADMIN' ORDER BY createdAt LIMIT 1");
  if (admin.rows.length === 0) throw new Error("No admin account to own the imported set.");
  const createdById = admin.rows[0].id;

  const urls = [];
  for (const [i, file] of crops.entries()) {
    urls.push(await saveStimulus(file, state, part1[i].n));
  }

  const setId = id();
  await db.execute({
    sql: `INSERT INTO QuestionSet (id, title, description, subject, isActive, createdAt, updatedAt, createdById)
          VALUES (?, ?, ?, ?, 1, ?, ?, ?)`,
    args: [setId, paper.title, describe(paper), SUBJECT, now(), now(), createdById],
  });
  await db.execute({
    sql: `INSERT INTO QuestionSetGrade (id, questionSetId, grade, createdAt) VALUES (?, ?, ?, ?)`,
    args: [id(), setId, GRADE, now()],
  });

  let picture = 0;
  for (const q of paper.questions) {
    const questionId = id();
    const isFree = q.type === "FREE";
    const diagramUrl = q.part === 1 && urls.length ? urls[picture++] : null;
    if (q.part === 1 && paper.stimulusPages && !diagramUrl) {
      throw new Error(`${state}: Q${q.n} has no picture.`);
    }

    await db.execute({
      sql: `INSERT INTO Question (id, body, explanation, diagramUrl, type, points, isActive, createdAt, updatedAt, questionSetId, createdById)
            VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?, ?, ?)`,
      args: [
        questionId,
        renderBody(q),
        // For a written answer the explanation carries the word the scheme
        // wants, which is what the marker needs in front of them and what the
        // student sees once they have answered.
        isFree
          ? [`Answer: ${q.answer}`, q.explanation].filter(Boolean).join(" — ")
          : (q.explanation ?? null),
        diagramUrl,
        isFree ? "FREE_RESPONSE" : "MULTIPLE_CHOICE",
        POINTS,
        now(),
        now(),
        setId,
        createdById,
      ],
    });

    if (!isFree) {
      const correctIndex = q.answer.charCodeAt(0) - 65;
      if (correctIndex < 0 || correctIndex >= q.choices.length) {
        throw new Error(`${state}: Q${q.n} answer ${q.answer} is outside its ${q.choices.length} options.`);
      }
      for (const [i, text] of q.choices.entries()) {
        await db.execute({
          sql: `INSERT INTO Choice (id, text, isCorrect, "order", questionId) VALUES (?, ?, ?, ?, ?)`,
          args: [id(), text, i === correctIndex ? 1 : 0, i, questionId],
        });
      }
    }
  }

  console.log(`  imported as set ${setId}`);
  return { set: setId, notes: keyNotes };
}

async function main() {
  const states = (
    wanted.length
      ? wanted
      : fs.readdirSync(DATA_DIR).filter((f) => f.endsWith(".mjs")).map((f) => f.replace(/\.mjs$/, ""))
  ).sort();

  console.log(`${DRY_RUN ? "Dry run" : "Importing"}: ${states.join(", ")}`);

  const allNotes = [];
  for (const state of states) {
    const { notes } = await importPaper(state);
    allNotes.push(...notes.map((n) => ({ state, ...n })));
  }

  if (allNotes.length) {
    console.log(`\n${allNotes.length} answer(s) differ from the printed SKEMA:`);
    for (const n of allNotes) console.log(`  ${n.state} Q${n.n} -> ${n.answer}: ${n.keyNote}`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
