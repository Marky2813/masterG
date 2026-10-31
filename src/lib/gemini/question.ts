// Server-only: read a maths question from a photo, screenshot or handwriting (Gemini Flash).
import { GoogleGenAI, ThinkingLevel } from "@google/genai";
import type { QuestionKind } from "../types";
import { FLASH_MODEL } from "./judge";
import { kindOf } from "../brain/kind";

let client: GoogleGenAI | null = null;
const ai = () => (client ??= new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! }));

export interface QuestionRead {
  text: string; // mathjs syntax for sums/equations; the sentence for word problems
  kind: QuestionKind;
  legible: boolean;
  ms: number;
}

const PROMPT = `This image contains ONE school maths question (NCERT Class 1-8): a photo of a textbook, a screenshot, or handwriting.
Return the question exactly, ready to solve:
- sums and equations in mathjs syntax: "*" for times, "/" for fractions, mixed numbers as "(1+2/3)", "lcm(4,6)", "hcf(12,18)", keep "=" for equations, variables as letters ("3x + 5 = 20")
- a word problem: the full sentence in plain text (keep the language it is written in)
- if there are several questions, take the most prominent one
kind: "chain" (fractions, decimals, BODMAS, LCM/HCF, exponents), "equation" (linear, one variable), "vertical" (long division / column layout), "word_problem", or "unsupported" (graphs to draw, constructions, geometry, "explain why").
Set legible=false only if you cannot read any question.`;

export async function readQuestion(imagePng: string): Promise<QuestionRead> {
  const started = performance.now();
  const [, mime = "image/png", data = imagePng] = imagePng.match(/^data:(image\/[a-z+]+);base64,(.*)$/) ?? [];
  const res = await ai().models.generateContent({
    model: FLASH_MODEL,
    contents: [{ role: "user", parts: [{ inlineData: { mimeType: mime, data } }, { text: PROMPT }] }],
    config: {
      temperature: 0,
      responseMimeType: "application/json",
      responseJsonSchema: {
        type: "object",
        properties: {
          text: { type: "string" },
          kind: { type: "string", enum: ["chain", "equation", "vertical", "word_problem", "unsupported"] },
          legible: { type: "boolean" },
        },
        required: ["text", "kind", "legible"],
      },
      thinkingConfig: /gemini-2\./.test(FLASH_MODEL) ? { thinkingBudget: 0 } : { thinkingLevel: ThinkingLevel.MINIMAL },
    },
  });
  const r = JSON.parse(res.text ?? "{}") as Omit<QuestionRead, "ms">;
  return { text: (r.text ?? "").trim(), kind: r.kind ?? "chain", legible: r.legible ?? false, ms: Math.round(performance.now() - started) };
}

// ---- Homework: a whole worksheet / textbook exercise -> an ordered list of questions ----

export const WORKSHEET_MAX = 12;

export interface WorksheetItem {
  text: string; // same rules as readQuestion: mathjs for sums/equations, the sentence for word problems
  kind: QuestionKind;
  label?: string; // the number printed on the sheet, e.g. "3" or "2(b)"
}

export interface WorksheetRead {
  title?: string; // e.g. "Exercise 2.3" or "Fractions worksheet"
  questions: WorksheetItem[];
  skipped: number; // items the model saw but left out (not maths, illegible, constructions)
  ms: number;
}

const WORKSHEET_PROMPT = `This is a school maths worksheet or textbook exercise (NCERT Class 1-8) that a teacher gave as homework: a photo, a screenshot, or pasted text.
List every question the child has to solve, in the order they appear, each ready to solve on its own:
- sums and equations in mathjs syntax: "*" for times, "/" for fractions, mixed numbers as "(1+2/3)", "lcm(4,6)", "hcf(12,18)", keep "=" for equations, variables as letters ("3x + 5 = 20")
- a word problem: the full sentence in plain text (keep the language it is written in)
- an instruction shared by several items ("Add:", "Solve:", "Simplify:") belongs to each item: write just the maths ("Add: 23 + 45" -> "23 + 45"; "Solve: 2x = 10" -> "2x = 10")
- vertical / column sums: write them on one line ("47 + 38")
- sub-parts (a), (b), (c) are separate questions; label = the number printed on the sheet ("1", "2(b)")
- skip headings, instructions on their own, examples that are already solved, answers, and anything that is not maths
- skip items you cannot read clearly; never guess digits
- skip "draw", "construct", "explain why", graph-plotting items and activities ("measure", "colour", "write in words", "place value of"): only questions that are worked out to a number or a solution
- never keep the instruction word or the blank: "Multiply: 368 × 7" -> "368 * 7", "14 + 9 = ____" -> "14 + 9"
kind: "chain" (arithmetic, fractions, decimals, BODMAS, LCM/HCF, exponents), "equation" (linear, one variable), "vertical" (long division / column layout), or "word_problem".
title: the exercise or worksheet heading if there is one ("Exercise 2.3", "Fractions"), else "".
skipped: how many items you left out.
At most ${WORKSHEET_MAX} questions: if there are more, take the first ${WORKSHEET_MAX}.`;

// A photo/screenshot (imagePng) and/or pasted text (e.g. homework the teacher sent on WhatsApp).
export async function readWorksheet(input: { imagePng?: string; text?: string }): Promise<WorksheetRead> {
  const started = performance.now();
  const parts: ({ inlineData: { mimeType: string; data: string } } | { text: string })[] = [];
  if (input.imagePng) {
    const [, mime = "image/png", data = input.imagePng] = input.imagePng.match(/^data:(image\/[a-z+]+);base64,(.*)$/) ?? [];
    parts.push({ inlineData: { mimeType: mime, data } });
  }
  if (input.text) parts.push({ text: `Homework text:\n"""\n${input.text.slice(0, 6000)}\n"""` });
  parts.push({ text: WORKSHEET_PROMPT });
  const res = await ai().models.generateContent({
    model: FLASH_MODEL,
    contents: [{ role: "user", parts }],
    config: {
      temperature: 0,
      responseMimeType: "application/json",
      responseJsonSchema: {
        type: "object",
        properties: {
          title: { type: "string" },
          questions: {
            type: "array",
            items: {
              type: "object",
              properties: {
                label: { type: "string" },
                text: { type: "string" },
                kind: { type: "string", enum: ["chain", "equation", "vertical", "word_problem"] },
              },
              required: ["label", "text", "kind"],
            },
          },
          skipped: { type: "integer" },
        },
        required: ["title", "questions", "skipped"],
      },
      thinkingConfig: /gemini-2\./.test(FLASH_MODEL) ? { thinkingBudget: 0 } : { thinkingLevel: ThinkingLevel.MINIMAL },
    },
  });
  const r = JSON.parse(res.text ?? "{}") as { title?: string; questions?: { label?: string; text?: string; kind?: string }[]; skipped?: number };
  const questions: WorksheetItem[] = (r.questions ?? [])
    .map((q) => {
      let text = (q.text ?? "").trim();
      if (q.kind !== "word_problem") {
        // The sheet's wording sometimes survives ("Multiply: 368 * 7", "14 + 9 = ____"): keep only the maths.
        text = text
          .replace(/^[A-Za-z][A-Za-z ]{1,30}:\s*/, "")
          .replace(/×/g, "*")
          .replace(/÷/g, "/")
          .replace(/[−–]/g, "-")
          .replace(/\s*=\s*[_?.…□\s]*$/, "")
          .trim();
      }
      // Sums and equations: kindOf (the same rule as typed questions). Word problems and column
      // layouts can't be told from the text, so the model's kind is kept for those.
      const kind: QuestionKind = q.kind === "word_problem" || q.kind === "vertical" ? q.kind : kindOf(text);
      return { text, kind, label: q.label?.trim() || undefined };
    })
    .filter((q) => q.text.length > 0)
    .slice(0, WORKSHEET_MAX);
  return { title: r.title?.trim() || undefined, questions, skipped: r.skipped ?? 0, ms: Math.round(performance.now() - started) };
}
