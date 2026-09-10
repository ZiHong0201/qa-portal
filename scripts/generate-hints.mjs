// One-time batch job: generates two AI study hints per question (cached in
// Question.hint1 / Question.hint2) so the cat companion can show a
// question-specific nudge without calling the API on every page view.
//
// Idempotent - only processes questions where hint1 IS NULL, so re-running
// after a failure or after adding new questions only costs tokens for the
// questions that still need hints.
//
// Usage: node scripts/generate-hints.mjs
import "dotenv/config";
import { createClient } from "@libsql/client";
import Anthropic from "@anthropic-ai/sdk";

const db = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const HINT_TOOL = {
  name: "record_hints",
  description: "Record two short study hints for this question.",
  input_schema: {
    type: "object",
    properties: {
      hint1: {
        type: "string",
        description:
          "A short, encouraging nudge (one sentence, under 25 words) that helps the student think about the question WITHOUT revealing or directly implying the correct answer.",
      },
      hint2: {
        type: "string",
        description:
          "A second, different short nudge - e.g. a relevant concept, a common mistake to avoid, or how to eliminate wrong options. Must also not reveal the correct answer.",
      },
    },
    required: ["hint1", "hint2"],
  },
};

async function fetchQuestionsNeedingHints() {
  const res = await db.execute(
    `SELECT id, body FROM Question WHERE hint1 IS NULL ORDER BY createdAt ASC`
  );
  return res.rows;
}

async function fetchChoices(questionId) {
  const res = await db.execute({
    sql: `SELECT text, isCorrect FROM Choice WHERE questionId = ?`,
    args: [questionId],
  });
  return res.rows;
}

function buildPrompt(body, choices) {
  const optionsText = choices
    .map((c, i) => `${String.fromCharCode(65 + i)}. ${c.text}${c.isCorrect ? "  [correct]" : ""}`)
    .join("\n");
  return `Question: ${body}\n\nOptions:\n${optionsText}\n\nWrite two short study hints for a student attempting this question. Do not reveal or strongly imply which option is correct - focus on the concept, a common pitfall, or a way to reason through it.`;
}

async function generateHints(body, choices) {
  const message = await anthropic.messages.create({
    model: "claude-sonnet-5",
    max_tokens: 300,
    tools: [HINT_TOOL],
    tool_choice: { type: "tool", name: "record_hints" },
    messages: [{ role: "user", content: buildPrompt(body, choices) }],
  });

  const toolUse = message.content.find((b) => b.type === "tool_use");
  if (!toolUse) throw new Error("No tool_use block in response");
  const { hint1, hint2 } = toolUse.input;
  if (typeof hint1 !== "string" || typeof hint2 !== "string") {
    throw new Error("Malformed hint response");
  }
  return { hint1, hint2, usage: message.usage };
}

async function main() {
  const questions = await fetchQuestionsNeedingHints();
  console.log(`${questions.length} question(s) need hints.`);

  let done = 0;
  let failed = 0;
  let inputTokens = 0;
  let outputTokens = 0;

  for (const q of questions) {
    try {
      const choices = await fetchChoices(q.id);
      const { hint1, hint2, usage } = await generateHints(q.body, choices);
      await db.execute({
        sql: `UPDATE Question SET hint1 = ?, hint2 = ? WHERE id = ?`,
        args: [hint1, hint2, q.id],
      });
      inputTokens += usage.input_tokens;
      outputTokens += usage.output_tokens;
      done++;
      console.log(`[${done + failed}/${questions.length}] ${q.id} ok`);
    } catch (err) {
      failed++;
      console.error(`[${done + failed}/${questions.length}] ${q.id} FAILED: ${err.message}`);
    }
  }

  console.log(
    `\nDone. ${done} succeeded, ${failed} failed. Tokens used: ${inputTokens} in / ${outputTokens} out.`
  );
}

main();
