// Server-only: one Gemini Flash call that reads (and judges) one handwritten step,
// then the deterministic checker overrides wherever it can compute (config "A+guard",
// PLAN.md §7). Never import this from client code: it uses GEMINI_API_KEY.
import { GoogleGenAI, ThinkingLevel, type ThinkingConfig } from "@google/genai";
import { decide } from "../brain/decide";
import type { ErrorCategory, QuestionKind, VerdictStatus } from "../types";
import { buildStepPrompt, stepResponseSchema, type StepResponse } from "./stepPrompt";

export const FLASH_MODEL = process.env.GEMINI_FLASH_MODEL || "gemini-3.5-flash-lite"; // probe 2026-10-31: 1.8 s; flash-latest 62-122 s

let client: GoogleGenAI | null = null;
function ai(): GoogleGenAI {
  if (!process.env.GEMINI_API_KEY) throw new Error("GEMINI_API_KEY missing: put it in .env.local");
  return (client ??= new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY }));
}

// Gemini 2.x takes a token budget; newer models take a thinking level. Same as the benchmark.
function thinkingOff(model: string): ThinkingConfig {
  return /gemini-2\./.test(model) ? { thinkingBudget: 0 } : { thinkingLevel: ThinkingLevel.MINIMAL };
}

export interface JudgeInput {
  imagePng: string; // data URL or bare base64
  question?: string;
  previous?: string;
  kind?: QuestionKind;
  categories?: ErrorCategory[];
}

export interface JudgeResult {
  text: string;
  alternatives: string[];
  legible: boolean;
  status: VerdictStatus;
  source: "model" | "checker";
  checkerReason?: string;
  modelVerdict?: StepResponse["verdict"];
  category?: string;
  newCategoryLabel?: string;
  explanation?: string;
  model: string;
  ms: number;
}

export async function judgeStep(input: JudgeInput): Promise<JudgeResult> {
  const started = performance.now();
  const res = await ai().models.generateContent({
    model: FLASH_MODEL,
    contents: [
      {
        role: "user",
        parts: [
          { inlineData: { mimeType: "image/png", data: input.imagePng.replace(/^data:image\/png;base64,/, "") } },
          {
            text: buildStepPrompt({
              task: "judge",
              question: input.question,
              previous: input.previous,
              categories: input.categories,
            }),
          },
        ],
      },
    ],
    config: {
      temperature: 0,
      responseMimeType: "application/json",
      responseJsonSchema: stepResponseSchema("judge"),
      thinkingConfig: thinkingOff(FLASH_MODEL),
    },
  });
  const r = JSON.parse(res.text ?? "{}") as StepResponse;
  const ms = Math.round(performance.now() - started);

  const base = {
    text: r.text ?? "",
    alternatives: r.alternatives ?? [],
    legible: r.legible ?? true,
    modelVerdict: r.verdict,
    category: r.category || undefined,
    newCategoryLabel: r.newCategoryLabel || undefined,
    explanation: r.explanation || undefined,
    model: FLASH_MODEL,
    ms,
  };
  if (!base.legible || !base.text) return { ...base, status: "unsure", source: "model" };

  const d = decide({ text: base.text, alternatives: base.alternatives, modelVerdict: r.verdict, question: input.question, previous: input.previous, kind: input.kind });
  return {
    ...base,
    status: d.status,
    source: d.source,
    checkerReason: d.reason,
    // A category only makes sense on a wrong step.
    ...(d.status === "correct" ? { category: undefined, newCategoryLabel: undefined, explanation: undefined } : {}),
  };
}
