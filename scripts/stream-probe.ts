// Does Live audio arrive faster than real time? Logs, per chunk, how far ahead (+) or behind (-)
// the stream is versus playback. Negative = an audible gap without a buffer.
// node --env-file=.env.local --import tsx scripts/stream-probe.ts
import { GoogleGenAI, ThinkingLevel, type LiveServerMessage, type ThinkingConfig } from "@google/genai";
import { liveConfig } from "../src/lib/voice/liveConfig";
import { LIVE_MODEL } from "../src/lib/voice/config";
async function main() {
  const all: [string, ThinkingConfig | undefined][] = [["default", undefined], ["MINIMAL", { thinkingLevel: ThinkingLevel.MINIMAL }], ["LOW", { thinkingLevel: ThinkingLevel.LOW }], ["budget0", { thinkingBudget: 0 }]];
  const pick = process.argv.slice(2); const runs = Number(process.env.RUNS ?? 2);
  const variants = pick.length ? all.filter(([n]) => pick.includes(n)) : all;
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
  for (const [name, tc] of variants) for (let run = 0; run < runs; run++) try {
    let t0 = performance.now() / 1000, firstMs = 0; let first = 0, audioSec = 0, worst = Infinity, chunks = 0; const tl: string[] = [];
    let done!: () => void; const fin = new Promise<void>((r) => (done = r));
    const s = await ai.live.connect({ model: LIVE_MODEL, config: { ...liveConfig("hinglish"), ...(tc ? { thinkingConfig: tc } : {}) }, callbacks: {
      onmessage: (m: LiveServerMessage) => {
        for (const p of m.serverContent?.modelTurn?.parts ?? []) if (p.inlineData?.data) {
          const now = performance.now() / 1000; if (!first) { first = now; firstMs = (now - t0) * 1000; }
          const ahead = audioSec - (now - first); // seconds of audio buffered ahead of real time when this chunk lands
          worst = Math.min(worst, ahead); tl.push(`${(now - first).toFixed(2)}s:${(audioSec).toFixed(2)}`); audioSec += (p.inlineData.data.length * 0.75) / 48000; chunks++;
        }
        if (m.serverContent?.turnComplete) done();
      }, onclose: (e: CloseEvent) => { if (e.code !== 1000) console.log(`  ${name} closed ${e.code} ${e.reason}`); done(); } } });
    t0 = performance.now() / 1000; s.sendClientContent({ turns: [{ role: "user", parts: [{ text: "[STEP c1 WRONG | child wrote: 3/4 + 1/6 = 4/10 | category: add_across | rung 3 | repeat 1] Explain fully, 3-4 sentences." }] }], turnComplete: true });
    await Promise.race([fin, new Promise((r) => setTimeout(r, 25000))]); s.close();
    console.log(`${name.padEnd(8)} run ${run + 1}: ${chunks} chunks, ${audioSec.toFixed(1)} s audio; first audio ${firstMs.toFixed(0)} ms, worst lag ${(worst * 1000).toFixed(0)} ms`);
  } catch (e) { console.log(`${name} run ${run + 1}: ERR ${(e as Error).message}`); }
}
main();
