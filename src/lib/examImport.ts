import mammoth from "mammoth";
import { getAnthropicClient } from "@/lib/anthropic";

export type ExtractedQuestion = {
  body: string;
  options: string[];
  correctIndex: number | null;
  marks: number;
  explanation: string | null;
};

const EXTRACT_TOOL = {
  name: "extract_questions",
  description: "Record the multiple-choice questions found in an exam paper.",
  input_schema: {
    type: "object" as const,
    properties: {
      questions: {
        type: "array",
        items: {
          type: "object",
          properties: {
            body: {
              type: "string",
              description: "The full text of the question, excluding the answer options.",
            },
            options: {
              type: "array",
              items: { type: "string" },
              minItems: 2,
              maxItems: 6,
              description: "The answer options in the order they appear in the paper.",
            },
            correctIndex: {
              type: ["integer", "null"],
              description:
                "0-based index into `options` of the correct answer, if it can be determined from the paper (e.g. an answer key or marked answer). Null if it cannot be determined.",
            },
            marks: {
              type: "integer",
              description: "Marks allotted to this question if stated in the paper.",
            },
            explanation: {
              type: ["string", "null"],
              description:
                "A brief explanation of why the correct answer is correct, if the paper provides one (e.g. in an answer key). Null if none is given.",
            },
          },
          required: ["body", "options", "marks"],
        },
      },
    },
    required: ["questions"],
  },
};

function buildPrompt(defaultMarks: number) {
  return `This document is an exam paper. Extract every multiple-choice question you can find.

For each question, record:
- the question text (without the option list)
- its answer options in order
- the correct answer's index, if the paper indicates one (e.g. an answer key, bolded/marked option, or answer sheet) — otherwise null
- the marks for that question if the paper states them, otherwise use ${defaultMarks}
- a brief explanation of the correct answer, only if the paper itself provides one (e.g. in an answer key) — otherwise null; do not invent one

Skip any non-multiple-choice questions (e.g. free-response, essay questions). Call the extract_questions tool with the result.`;
}

function parseToolResult(content: unknown[]): ExtractedQuestion[] {
  const toolUse = content.find(
    (block): block is { type: "tool_use"; input: { questions?: unknown[] } } =>
      typeof block === "object" &&
      block !== null &&
      "type" in block &&
      (block as { type?: unknown }).type === "tool_use"
  );
  const rawQuestions = toolUse?.input?.questions ?? [];

  const questions: ExtractedQuestion[] = [];
  for (const raw of rawQuestions) {
    if (typeof raw !== "object" || raw === null) continue;
    const r = raw as Record<string, unknown>;
    const body = typeof r.body === "string" ? r.body.trim() : "";
    const options = Array.isArray(r.options)
      ? r.options.filter((o): o is string => typeof o === "string" && o.trim().length > 0)
      : [];
    if (!body || options.length < 2) continue;

    const correctIndex =
      typeof r.correctIndex === "number" && r.correctIndex >= 0 && r.correctIndex < options.length
        ? r.correctIndex
        : null;
    const marks = typeof r.marks === "number" && r.marks > 0 ? Math.round(r.marks) : 10;
    const explanation =
      typeof r.explanation === "string" && r.explanation.trim().length > 0
        ? r.explanation.trim()
        : null;

    questions.push({ body, options, correctIndex, marks, explanation });
  }
  return questions;
}

export async function extractFromPdf(
  buffer: Buffer,
  defaultMarks: number
): Promise<ExtractedQuestion[]> {
  const client = getAnthropicClient();
  const message = await client.messages.create({
    model: "claude-sonnet-5",
    max_tokens: 8000,
    tools: [EXTRACT_TOOL],
    tool_choice: { type: "tool", name: "extract_questions" },
    messages: [
      {
        role: "user",
        content: [
          {
            type: "document",
            source: {
              type: "base64",
              media_type: "application/pdf",
              data: buffer.toString("base64"),
            },
          },
          { type: "text", text: buildPrompt(defaultMarks) },
        ],
      },
    ],
  });

  return parseToolResult(message.content);
}

export async function extractFromDocx(
  buffer: Buffer,
  defaultMarks: number
): Promise<ExtractedQuestion[]> {
  const { value: text } = await mammoth.extractRawText({ buffer });
  if (!text.trim()) {
    throw new Error("Could not read any text from that document.");
  }

  const client = getAnthropicClient();
  const message = await client.messages.create({
    model: "claude-sonnet-5",
    max_tokens: 8000,
    tools: [EXTRACT_TOOL],
    tool_choice: { type: "tool", name: "extract_questions" },
    messages: [
      {
        role: "user",
        content: `${buildPrompt(defaultMarks)}\n\n---\n\n${text}`,
      },
    ],
  });

  return parseToolResult(message.content);
}
