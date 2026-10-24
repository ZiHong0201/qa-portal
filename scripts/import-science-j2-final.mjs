// Imports Section A (the 20 objective questions) of "2025 Sem 2 Final Exam -
// J2 Science.docx" as one Form 2 Science set. Sections B and C are structured
// questions and are left out.
//
// The paper is in English only and came without an answer sheet, so ANSWERS
// were worked out question by question. Once imported, a correction is made
// on the question's edit screen in admin.
//
// The four diagrams go to public/, as the other Science papers' did, so they
// show once the copies are committed and deployed.
//
// Usage (imageDir is the docx's word/media folder, unzipped):
//   node scripts/import-science-j2-final.mjs <imageDir> --dry-run
//   node scripts/import-science-j2-final.mjs <imageDir>
import "dotenv/config";
import fs from "fs";
import path from "path";
import crypto from "crypto";
import { fileURLToPath } from "url";
import { createClient } from "@libsql/client";

const HERE = path.dirname(fileURLToPath(import.meta.url));

const [imageDir] = process.argv.slice(2);
const DRY_RUN = process.argv.includes("--dry-run");

const TITLE = "Science Form 2 — 2025 Sem 2 Final Exam (J2), Section A";
const DESCRIPTION =
  "The 20 objective questions from the J2 Science Semester 2 final exam, 2025: " +
  "Water and Solution, Acid and Alkali, Energy, Electricity and Magnetism, " +
  "Force and Motion, Heat, and Sound Waves.";
const SUBJECT = "Science";
const GRADE = "Form 2";
const POINTS = 10;

// [body, options A-D, answer, diagram in imageDir]
// prettier-ignore
const QUESTIONS = [
  ["Solution X cannot dissolve any more solute and form precipitate. What is solution X?",
    ["Saturated solution", "Concentrated solution", "Cloudy solution", "Dilute solution"], "A"],
  // Strictly, stirring and solute size change only how fast a solute
  // dissolves. The paper's odd one out is B, which is not a factor at all.
  ["Which of the following factors does not affect the solubility of a solute in a solvent?",
    ["The rate of stirring", "The surface area of the solvent", "The size of the solute", "The temperature of the solvent"], "B"],
  ["Which of the following methods can control water pollution effectively?",
    ["Treating sewage water", "Builds tall chimneys", "Throws rubbish into the river", "Encourages farmers to use chemical fertilisers"], "A"],
  ["What is meant by neutralisation?",
    ["The reaction between acid and alkali which produce salt and hydrogen.",
     "The reaction between acid and alkali which produce hydrogen and water.",
     "The reaction between acid and alkali which produce salt and water.",
     "The reaction between acid and alkali which produce salt and carbon dioxide."], "C"],
  // A bee sting is acidic, not alkaline - which is why soap treats it.
  ["Which of the statement is not true about the applications of neutralisation?",
    ["Toothpaste containing magnesium hydroxide neutralises the acid produced by bacteria on teeth",
     "Antacid such as magnesia milk is taken to relieve the gastric pain caused by excessive hydrochloric acid in the stomach",
     "Add calcium hydroxide with the soil reduces the acidity of the soil.",
     "Swelling caused by alkaline bee sting can be treated with soap solution."], "D"],
  ["Diagram 1 shows the self-care products bought by Isabelle.\n\nWhy are we advisable to apply toner after washing the face with cleanser?",
    ["Toner is used to clean dirt on the face.", "Toner is used to neutralise the acidic cleanser.",
     "Toner is used to neutralise the alkaline cleanser.", "Toner is used to protect the face from microorganisms"], "C", "image1.png"],
  ["The energy stored in food is",
    ["Chemical energy", "Kinetic energy", "Heat energy", "Light energy"], "A"],
  ["A stretched rubber band stores",
    ["Thermal energy", "Elastic potential energy", "Sound energy", "Magnetic energy"], "B"],
  ["A positively charged object has",
    ["More protons than electrons", "More electrons than protons", "Equal protons and electrons", "More neutrons than protons"], "A"],
  ["Which arrangement makes a stronger electromagnet?",
    ["More turns of coil, higher current", "Fewer turns of coil, higher current",
     "More turns of coil, lower current", "Fewer turns of coil, lower current"], "A"],
  // Current leaves + and enters the coil at Q; the turns slope so that it
  // runs downward across the front. By the right-hand grip rule, N is at P.
  ["Diagram 2 shows a solenoid carrying current. Where is the north pole in the solenoid?",
    ["P", "Q", "R", "S"], "A", "image2.png"],
  ["A moving ball slows down on grass mainly due to",
    ["Tension", "Friction", "Gravity", "Thrust"], "B"],
  ["If a force of 20 N acts at 0.5 m from a pivot, the moment is",
    ["5 Nm", "10 Nm", "15 Nm", "20 Nm"], "B"],
  ["Which is NOT a characteristic of force?",
    ["Magnitude", "Direction", "Point of application", "Temperature"], "D"],
  // All three sit in the same boiling water, so the same temperature; Q is
  // the largest sphere and R the smallest, so Q holds the most heat.
  ["Diagram 3 shows an activity carried out in a laboratory. Three metal spheres P, Q, and R of the same type are heated in boiling water. Which of the following statements is true about the temperature and heat content in each metal sphere?",
    ["Temperature: P = Q = R, Heat content: P > Q > R", "Temperature: Q > P > R, Heat content: P = Q = R",
     "Temperature: P > Q > R, Heat content: P = Q = R", "Temperature: P = Q = R, Heat content: Q > P > R"], "D", "image3.png"],
  ["Why are cooking pots often made of metal but have wooden or plastic handles?",
    ["Metal is a poor conductor, wood conducts heat better", "Metal is a good conductor, wood or plastic is a poor conductor",
     "Both metal and wood are poor conductors", "Both metal and wood are good conductors"], "B"],
  ["A metal ball is heated and expands. Which statement is correct?",
    ["The particles become larger in size", "The distance between the particles increases",
     "The number of particles increases", "The particles stop moving"], "B"],
  ["What are the characteristics of sound waves?\n\nI. Can be reflected\nII. Can be absorbed\nIII. Do not need a medium to propagate\nIV. The speed of propagation of sound is same in all types of medium",
    ["I and II", "III and IV", "II and III", "I and IV"], "A"],
  ["Diagram 4 shows the Doppler effect. Which of the following best describes this effect?",
    ["The change in amplitude caused by the movement of the sound source, the observer, or both.",
     "The change in frequency caused by the movement of the sound source, the observer, or both.",
     "The change in wavelength caused by the movement of the sound source, the observer, or both.",
     "The change in the speed of the sound wave caused by the movement of the sound source, the observer, or both."], "B", "image4.png"],
  ["Which of the following statements are true about an echo?\n\nI. It often occurs in open space areas.\nII. It takes some time to reach the listener's ears.\nIII. Some animals use echoes to determine distance and depth.\nIV. It is the result of sound waves being absorbed when they hit a soft surface.",
    ["I and II", "III and IV", "II and III", "I and IV"], "C"],
];

if (!imageDir) {
  console.error("Usage: node scripts/import-science-j2-final.mjs <imageDir> [--dry-run]");
  process.exit(1);
}

// ---- checks before anything is written --------------------------------------
const tally = { A: 0, B: 0, C: 0, D: 0 };
for (const [i, [body, options, answer, image]] of QUESTIONS.entries()) {
  if (!body || options.length !== 4) throw new Error(`Q${i + 1} needs a body and four options.`);
  if (!"ABCD".includes(answer) || answer.length !== 1) throw new Error(`Q${i + 1} answer ${answer} is not A-D.`);
  if (image && !fs.existsSync(path.join(imageDir, image))) throw new Error(`Q${i + 1}: ${image} not in ${imageDir}.`);
  tally[answer]++;
}
console.log(`${QUESTIONS.length} questions, ${QUESTIONS.filter((q) => q[3]).length} with a diagram`);
console.log(`answer spread: ${Object.entries(tally).map(([k, v]) => `${k} ${v}`).join(", ")}`);

if (DRY_RUN) {
  const [body, options, answer, image] = QUESTIONS[14];
  console.log(`\nsample - Q15 body:\n${body}\nimage: ${image}`);
  console.log(`options:\n${options.map((o, j) => `  ${"ABCD"[j]}. ${o}`).join("\n")}\nanswer: ${answer}`);
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

const publicDir = path.join(HERE, "..", "public", "questions", "science-j2-final");
fs.mkdirSync(publicDir, { recursive: true });
const urlFor = {};
for (const [i, q] of QUESTIONS.entries()) {
  if (!q[3]) continue;
  const name = `q${String(i + 1).padStart(2, "0")}.png`;
  fs.copyFileSync(path.join(imageDir, q[3]), path.join(publicDir, name));
  urlFor[i] = `/questions/science-j2-final/${name}`;
}

const setId = id();
const base = Date.now();
const statements = [
  {
    sql: `INSERT INTO QuestionSet (id, title, description, subject, isActive, createdAt, updatedAt, createdById, bilingual)
          VALUES (?, ?, ?, ?, 1, ?, ?, ?, 0)`,
    args: [setId, TITLE, DESCRIPTION, SUBJECT, iso(base), iso(base), createdById],
  },
  {
    sql: `INSERT INTO QuestionSetGrade (id, questionSetId, grade, createdAt) VALUES (?, ?, ?, ?)`,
    args: [id(), setId, GRADE, iso(base)],
  },
];

for (const [i, [body, options, answer]] of QUESTIONS.entries()) {
  const qid = id();
  // One millisecond apart: students see questions in createdAt order, and a
  // tie would let two of them swap places.
  const at = iso(base + 1 + i);
  statements.push({
    sql: `INSERT INTO Question (id, body, explanation, diagramUrl, type, points, isActive, createdAt, updatedAt, questionSetId, createdById)
          VALUES (?, ?, NULL, ?, 'MULTIPLE_CHOICE', ?, 1, ?, ?, ?, ?)`,
    args: [qid, body, urlFor[i] ?? null, POINTS, at, at, setId, createdById],
  });
  for (const [j, text] of options.entries()) {
    statements.push({
      sql: `INSERT INTO Choice (id, text, isCorrect, "order", questionId) VALUES (?, ?, ?, ?, ?)`,
      args: [id(), text, "ABCD"[j] === answer ? 1 : 0, j, qid],
    });
  }
}

// All or nothing: one transaction, so a failure part-way cannot leave half a
// paper in the portal.
await db.batch(statements, "write");
console.log(`\nimported set ${setId}: ${QUESTIONS.length} questions, ${Object.keys(urlFor).length} diagrams`);
