import { SEED_CATEGORIES } from "../categories";
import type { ErrorCategory } from "../types";

// Prompt + JSON schema for reading (and optionally judging) one handwritten step.
// Shared by the benchmark and the app so we benchmark exactly what we ship.

export type StepTask = "read" | "judge";

export interface StepPromptInput {
  task: StepTask;
  question?: string;
  previous?: string;
  categories?: ErrorCategory[];
}

export interface StepResponse {
  text: string;
  alternatives: string[];
  legible: boolean;
  verdict?: "correct" | "wrong" | "unsure";
  category?: string;
  newCategoryLabel?: string;
  explanation?: string;
}

const READ_RULES = `Transcribe the handwritten math in the image EXACTLY as the student wrote it — do not fix mistakes.
Output mathjs syntax:
- multiplication "*" (never "×" or "x" for times), division "/", minus "-"
- fractions "a/b"; mixed numbers as "(1+2/3)"; use brackets where the layout implies them
- "lcm(4,6)", "hcf(12,18)"; exponents "2^3"; keep "=" signs where written
- a line that starts with "=" continues the previous line — keep the leading "="
- variables stay as letters ("3x", "4(m+6)")
If a character could be read two ways (1/7, 4/9, 5/S, 6/b, 0/6), put your best reading in "text" and every other plausible full-line reading in "alternatives". Otherwise "alternatives" is [].
Set "legible" to false only if you cannot read the step at all.`;

function judgeRules(categories: ErrorCategory[]): string {
  const list = categories.map((c) => `- ${c.id}: ${c.label}`).join("\n");
  return `Then judge whether this step is mathematically correct, given the question and the previous step.
- "correct": the step is true and follows from the previous step/question.
- "wrong": the step contains a mathematical error.
- "unsure": you cannot tell. Prefer "unsure" over guessing — wrongly calling a correct step wrong is the worst possible error.
If wrong, set "category" to the id of the matching mistake category below. Reuse an existing category whenever it fits. Only if none fits, invent a short snake_case id and give a short Hinglish label in "newCategoryLabel".
Mistake categories:
${list}
Set "explanation" to one short sentence (English) saying exactly what went wrong.`;
}

export function buildStepPrompt(input: StepPromptInput): string {
  const ctx = [
    input.question ? `Question: ${input.question}` : "Question: (not given)",
    input.previous ? `Previous step: ${input.previous}` : "Previous step: (none — this is the first step)",
  ].join("\n");
  const rules =
    input.task === "judge" ? `${READ_RULES}\n\n${judgeRules(input.categories ?? SEED_CATEGORIES)}` : READ_RULES;
  return `You are checking one step of a school student's handwritten math working (NCERT Class 5–8).\n${ctx}\n\n${rules}\n\nRespond with JSON only.`;
}

export function stepResponseSchema(task: StepTask): object {
  const properties: Record<string, object> = {
    text: { type: "string" },
    alternatives: { type: "array", items: { type: "string" } },
    legible: { type: "boolean" },
  };
  const required = ["text", "alternatives", "legible"];
  if (task === "judge") {
    properties.verdict = { type: "string", enum: ["correct", "wrong", "unsure"] };
    properties.category = { type: "string" };
    properties.newCategoryLabel = { type: "string" };
    properties.explanation = { type: "string" };
    required.push("verdict");
  }
  return { type: "object", properties, required };
}
