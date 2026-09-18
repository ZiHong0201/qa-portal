// Generates the answer explanation for every active question that still has
// none, using the Anthropic API. The explanation is what a student sees after
// answering wrong, alongside the correct answer, so it names the correct
// option, says why it is right, and says why the tempting alternatives are
// wrong - in the language the question is written in.
//
// The model is also asked which option it believes is correct, independently
// of the answer key. When that disagrees with the choice marked isCorrect the
// question is NOT written - it is listed at the end as DISPUTED so the key can
// be checked by hand (a wrong key plus a confident explanation of it would be
// worse than no explanation at all).
//
// Idempotent - only questions with an empty explanation are processed, so
// re-running after a failure or a new import only costs tokens for what is
// still missing. Same DB access pattern as scripts/generate-hints.mjs.
//
// Usage:
//   node scripts/generate-explanations.mjs [setId|titleFragment] [options]
//     --out <file.json>   write a { questionId: explanation } map for review
//                         instead of updating the DB; apply it later with
//                         scripts/apply-explanations.mjs
//     --limit <n>         stop after n questions (try a handful first)
//     --concurrency <n>   parallel API calls (default 4)
//     --dry-run           list what would be processed, no API calls
import "dotenv/config";
import { writeFileSync } from "fs";
import { createClient } from "@libsql/client";
import Anthropic from "@anthropic-ai/sdk";

const MODEL = "claude-opus-5";
// Matches the cap the admin edit form and apply-explanations.mjs enforce.
const MAX_EXPLANATION_CHARS = 2000;

const args = process.argv.slice(2);
function flag(name) {
  const i = args.indexOf(name);
  if (i === -1) return undefined;
  return args[i + 1];
}
const DRY_RUN = args.includes("--dry-run");
const OUT_FILE = flag("--out");
const LIMIT = flag("--limit") ? Number(flag("--limit")) : Infinity;
const CONCURRENCY = flag("--concurrency") ? Number(flag("--concurrency")) : 4;
const VALUE_FLAGS = new Set(["--out", "--limit", "--concurrency"]);
const target = args.find((a, i) => !a.startsWith("--") && !VALUE_FLAGS.has(args[i - 1]));

const db = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

if (!DRY_RUN && !process.env.ANTHROPIC_API_KEY) {
  console.error("ANTHROPIC_API_KEY is not set (add it to .env)");
  process.exit(1);
}
const anthropic = DRY_RUN ? null : new Anthropic();

const EXPLANATION_TOOL = {
  name: "record_explanation",
  description: "Record the worked answer and explanation for one multiple-choice question.",
  strict: true,
  input_schema: {
    type: "object",
    additionalProperties: false,
    properties: {
      answer: {
        type: "string",
        description:
          "The letter (A, B, C, ...) of the option YOU believe is correct, worked out from the question itself. Decide this before reading the marked answer, and do not change it to match the key if you disagree.",
      },
      confidence: {
        type: "string",
        enum: ["high", "medium", "low"],
        description: "How sure you are that `answer` is correct.",
      },
      explanation: {
        type: "string",
        description:
          "The explanation shown to a student who answered wrongly, next to the correct answer. Written in the same language as the question (Bahasa Melayu questions get a Bahasa Melayu explanation). Start with why the correct option is right - the fact, rule, or working - then briefly say why each other option is wrong or tempting. Plain text, no markdown headings, no option letters restated as a list. Under 1500 characters; usually 2-5 sentences, longer only when a calculation must be shown.",
      },
    },
    required: ["answer", "confidence", "explanation"],
  },
};

const SYSTEM = `You write answer explanations for a Malaysian SPM revision portal (Form 4 and Form 5 students). Each question is multiple-choice and comes with the option its author marked as correct.

Work the question out yourself first. If your answer differs from the marked one, keep your own answer in the \`answer\` field - the mismatch is used to catch mistakes in the answer key. Write the explanation for the option you believe is correct.

Match the question's language exactly: Bahasa Melayu for Bahasa Melayu questions, English for English questions. Use the SPM syllabus's own terminology. Be concrete: a Sejarah explanation names the event, figure, date or reason the question turns on; a Mathematics explanation shows the working that reaches the answer; a Science explanation states the principle and applies it. Never mention that a diagram was or was not visible to you, and never refer to "the marked answer" or "the answer key" in the explanation itself.`;

async function fetchQuestions() {
  let sql = `SELECT q.id, q.body, q.diagramUrl, s.title AS setTitle, s.subject
             FROM Question q JOIN QuestionSet s ON s.id = q.questionSetId
             WHERE q.isActive = 1 AND (q.explanation IS NULL OR TRIM(q.explanation) = '')`;
  const params = [];
  if (target) {
    sql += ` AND (s.id = ? OR s.title LIKE ?)`;
    params.push(target, `%${target}%`);
  }
  sql += ` ORDER BY s.subject, s.title, q.createdAt, q.id`;
  const res = await db.execute({ sql, args: params });
  return res.rows;
}

async function fetchChoices(questionId) {
  const res = await db.execute({
    sql: `SELECT text, isCorrect FROM Choice WHERE questionId = ? ORDER BY "order"`,
    args: [questionId],
  });
  return res.rows;
}

const letter = (i) => String.fromCharCode(65 + i);

function buildContent(q, choices) {
  const optionsText = choices.map((c, i) => `${letter(i)}. ${c.text}`).join("\n");
  const markedIndex = choices.findIndex((c) => c.isCorrect);
  const text = `Subject: ${q.subject}
Topic: ${q.setTitle}

Question:
${q.body}

Options:
${optionsText}

Marked as correct by the question's author: ${markedIndex === -1 ? "(none marked)" : letter(markedIndex)}

Work out the answer, then call record_explanation.`;

  const content = [];
  if (q.diagramUrl) {
    content.push({ type: "image", source: { type: "url", url: String(q.diagramUrl) } });
  }
  content.push({ type: "text", text });
  return content;
}

async function generate(q, choices) {
  const message = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 16000,
    system: [{ type: "text", text: SYSTEM, cache_control: { type: "ephemeral" } }],
    tools: [EXPLANATION_TOOL],
    tool_choice: { type: "tool", name: "record_explanation" },
    messages: [{ role: "user", content: buildContent(q, choices) }],
  });

  if (message.stop_reason === "refusal") {
    throw new Error(`refused (${message.stop_details?.category ?? "no category"})`);
  }
  const toolUse = message.content.find((b) => b.type === "tool_use");
  if (!toolUse) throw new Error(`no tool_use block (stop_reason ${message.stop_reason})`);
  const { answer, confidence, explanation } = toolUse.input;
  if (typeof answer !== "string" || typeof explanation !== "string") {
    throw new Error("malformed tool input");
  }
  return {
    answer: answer.trim().toUpperCase().charAt(0),
    confidence,
    explanation: explanation.trim(),
    usage: message.usage,
  };
}

async function main() {
  const all = await fetchQuestions();
  const questions = all.slice(0, LIMIT);
  console.log(
    `${all.length} question(s) missing an explanation${target ? ` in sets matching "${target}"` : ""}` +
      (questions.length < all.length ? `; processing the first ${questions.length}` : "")
  );

  if (DRY_RUN) {
    let set = "";
    for (const q of questions) {
      const key = `${q.subject} / ${q.setTitle}`;
      if (key !== set) {
        set = key;
        console.log(`\n== ${key} ==`);
      }
      console.log(`  ${q.id}  ${String(q.body).replace(/\s+/g, " ").slice(0, 90)}`);
    }
    return;
  }

  const written = {};
  const disputed = [];
  const failed = [];
  let inputTokens = 0;
  let outputTokens = 0;
  let cachedTokens = 0;
  let next = 0;
  let done = 0;

  async function worker() {
    while (next < questions.length) {
      const q = questions[next++];
      const tag = `[${++done}/${questions.length}] ${q.id}`;
      try {
        const choices = await fetchChoices(q.id);
        const markedIndex = choices.findIndex((c) => c.isCorrect);
        const marked = markedIndex === -1 ? null : letter(markedIndex);
        const result = await generate(q, choices);
        inputTokens += result.usage.input_tokens;
        outputTokens += result.usage.output_tokens;
        cachedTokens += result.usage.cache_read_input_tokens ?? 0;

        if (result.answer !== marked) {
          disputed.push({
            id: q.id,
            set: `${q.subject} / ${q.setTitle}`,
            marked,
            model: result.answer,
            confidence: result.confidence,
            body: String(q.body).replace(/\s+/g, " ").slice(0, 120),
          });
          console.log(`${tag} DISPUTED - key says ${marked}, model says ${result.answer} (${result.confidence})`);
          continue;
        }
        if (result.explanation.length > MAX_EXPLANATION_CHARS) {
          failed.push({ id: q.id, error: `explanation is ${result.explanation.length} chars (cap ${MAX_EXPLANATION_CHARS})` });
          console.log(`${tag} TOO LONG (${result.explanation.length} chars)`);
          continue;
        }

        if (OUT_FILE) {
          written[q.id] = result.explanation;
        } else {
          await db.execute({
            sql: `UPDATE Question SET explanation = ? WHERE id = ?`,
            args: [result.explanation, q.id],
          });
        }
        console.log(`${tag} ok (${result.answer}, ${result.confidence})`);
      } catch (err) {
        failed.push({ id: q.id, error: err.message });
        console.error(`${tag} FAILED: ${err.message}`);
      }
    }
  }

  await Promise.all(Array.from({ length: Math.max(1, CONCURRENCY) }, worker));

  if (OUT_FILE) {
    writeFileSync(OUT_FILE, JSON.stringify(written, null, 2) + "\n");
    console.log(`\nWrote ${Object.keys(written).length} explanation(s) to ${OUT_FILE} - review, then: node scripts/apply-explanations.mjs ${OUT_FILE}`);
  } else {
    console.log(`\nUpdated ${questions.length - disputed.length - failed.length} question(s) in the database.`);
  }

  if (disputed.length) {
    console.log(`\n${disputed.length} DISPUTED - not written, check the answer key:`);
    for (const d of disputed) {
      console.log(`  ${d.id}  key ${d.marked} vs model ${d.model} (${d.confidence})  ${d.set}\n      ${d.body}`);
    }
  }
  if (failed.length) {
    console.log(`\n${failed.length} FAILED (re-run to retry):`);
    for (const f of failed) console.log(`  ${f.id}  ${f.error}`);
  }
  console.log(
    `\nTokens: ${inputTokens} in (${cachedTokens} from cache) / ${outputTokens} out.`
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
