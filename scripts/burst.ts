// Fire N parallel minimal calls to see whether the key's per-minute quota holds: node --env-file=.env.local --import tsx scripts/burst.ts [N] [model]
import { GoogleGenAI, ThinkingLevel } from "@google/genai";
async function main() {
  const n = Number(process.argv[2] ?? 20);
  const model = process.argv[3] ?? "gemini-3.5-flash-lite";
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY!, httpOptions: { retryOptions: { attempts: 1 }, timeout: 30000 } });
  const t0 = performance.now();
  const res = await Promise.all(
    Array.from({ length: n }, async () => {
      const t = performance.now();
      try {
        await ai.models.generateContent({ model, contents: "Reply ok", config: { thinkingConfig: { thinkingLevel: ThinkingLevel.MINIMAL } } });
        return { ok: true, ms: performance.now() - t };
      } catch (e) {
        return { ok: false, ms: performance.now() - t, err: String((e as Error).message).match(/"code":(\d+)/)?.[1] ?? "?" };
      }
    }),
  );
  const ok = res.filter((r) => r.ok);
  const ms = ok.map((r) => r.ms).sort((a, b) => a - b);
  console.log(`${model}: ${ok.length}/${n} ok in ${Math.round(performance.now() - t0)} ms; p50 ${Math.round(ms[Math.floor(ms.length / 2)] ?? 0)} ms, max ${Math.round(ms.at(-1) ?? 0)} ms; errors: ${JSON.stringify(res.filter((r) => !r.ok).map((r) => r.err))}`);
}
main();
