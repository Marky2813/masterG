// Server-only: read a maths question from a photo, screenshot or handwriting (Gemini Flash).
import { GoogleGenAI, ThinkingLevel } from "@google/genai";
import type { QuestionKind } from "../types";
import { FLASH_MODEL } from "./judge";

let client: GoogleGenAI | null = null;
const ai = () => (client ??= new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! }));

export interface QuestionRead {
  text: string; // mathjs syntax for sums/equations; the sentence for word problems
  kind: QuestionKind;
  legible: boolean;
  ms: number;
}

const PROMPT = `This image contains ONE school maths question (NCERT Class 5-8): a photo of a textbook, a screenshot, or handwriting.
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
