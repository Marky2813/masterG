// One Gemini call with retries off, to see raw errors and latency: node --env-file=.env.local --import tsx scripts/one-call.ts <model> [level]
import { GoogleGenAI } from "@google/genai";
async function main() {
  const [model = "gemini-flash-latest", level] = process.argv.slice(2);
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY!, httpOptions: { timeout: 45000, retryOptions: { attempts: 1 } } });
  const t = performance.now();
  try {
    const r = await ai.models.generateContent({ model, contents: "Reply with the single word ok", config: level ? { thinkingConfig: { thinkingLevel: level as never } } : {} });
    console.log(`${model} ${level ?? "default"} ${Math.round(performance.now() - t)} ms -> ${r.text?.trim()}`);
  } catch (e) {
    console.log(`${model} ${level ?? "default"} ${Math.round(performance.now() - t)} ms ERR ${String((e as Error).message).slice(0, 300)}`);
  }
}
main();
