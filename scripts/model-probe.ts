// Probe which model + thinking settings work for step judging, and how fast: node --env-file=.env.local --import tsx scripts/model-probe.ts
import { GoogleGenAI, ThinkingLevel, type ThinkingConfig } from "@google/genai";
import { readFileSync } from "node:fs";
import { buildStepPrompt, stepResponseSchema } from "../src/lib/gemini/stepPrompt";
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
const png = readFileSync("/home/adot/projects/hackathonProjects/masterG/benchmark/samples/fractions-001.png").toString("base64");
const combos: [string, ThinkingConfig | undefined][] = [
  ["gemini-flash-latest", { thinkingLevel: ThinkingLevel.LOW }],
  ["gemini-flash-latest", undefined],
  ["gemini-3.8-flash", { thinkingLevel: ThinkingLevel.MINIMAL }],
  ["gemini-3.5-flash", { thinkingLevel: ThinkingLevel.MINIMAL }],
  ["gemini-3.5-flash-lite", { thinkingLevel: ThinkingLevel.MINIMAL }],
  ["gemini-2.5-flash", { thinkingBudget: 0 }],
];
async function main() {
for (const [model, thinkingConfig] of combos) {
  const t = performance.now();
  try {
    const r = await ai.models.generateContent({ model, contents: [{ role: "user", parts: [{ inlineData: { mimeType: "image/png", data: png } }, { text: buildStepPrompt({ task: "judge", question: "3/4 + 1/6" }) }] }],
      config: { temperature: 0, responseMimeType: "application/json", responseJsonSchema: stepResponseSchema("judge"), ...(thinkingConfig ? { thinkingConfig } : {}) } });
    const j = JSON.parse(r.text ?? "{}");
    console.log(`${model.padEnd(24)} ${JSON.stringify(thinkingConfig ?? "default").padEnd(28)} ${Math.round(performance.now() - t)} ms  text=${j.text} verdict=${j.verdict} cat=${j.category}`);
  } catch (e) { console.log(`${model.padEnd(24)} ${JSON.stringify(thinkingConfig ?? "default").padEnd(28)} ERR ${String((e as Error).message).slice(0, 120)}`); }
}
}
main();
