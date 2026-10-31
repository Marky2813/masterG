// How often does Masterji SPEAK a tool call instead of making it? Runs N sessions through
// rungs 1-4 and counts real tool calls vs tool syntax in his speech.
// node --env-file=.env.local --import tsx scripts/tool-probe.ts [sessions=4]
import { GoogleGenAI, type LiveServerMessage } from "@google/genai";
import { liveConfig } from "../src/lib/voice/liveConfig";
import { LIVE_MODEL } from "../src/lib/voice/config";
import { questionFacts } from "../src/lib/brain/facts";

const SPOKEN = /write_(note|line)|\bc1\b|ACTION|\[/i;

async function one(n: number) {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
  let said = "", calls = 0, spoken = 0; let done!: () => void;
  const wait = () => new Promise<void>((r) => { done = r; setTimeout(r, 25000); });
  const session = await ai.live.connect({ model: LIVE_MODEL, config: liveConfig("hinglish"), callbacks: {
    onmessage: (m: LiveServerMessage) => {
      if (m.serverContent?.outputTranscription?.text) said += m.serverContent.outputTranscription.text;
      for (const fc of m.toolCall?.functionCalls ?? []) { calls++; session.sendToolResponse({ functionResponses: { id: fc.id, name: fc.name, response: { ok: true } } }); }
      if (m.serverContent?.turnComplete) { if (SPOKEN.test(said)) { spoken++; console.log(`   session ${n} SPOKE: "${said.trim().slice(0, 160)}"`); } said = ""; done(); }
    } } });
  const send = async (text: string) => { const w = wait(); session.sendClientContent({ turns: [{ role: "user", parts: [{ text }] }], turnComplete: true }); await w; };
  const q = "3/4 + 1/6";
  await send(`[SESSION START] Greet the child and ask their name.\n[QUESTION SET: ${q}]\n[FACTS (computed, correct; copy these when writing): ${questionFacts(q).join(" ; ")}]`);
  for (const rung of [1, 2, 3, 4]) {
    const action = rung >= 4 ? " | ACTION: call write_line with the correct step from FACTS, then ask the child to do the next line" : rung === 3 ? " | ACTION: write_note the one fact they need (from FACTS)" : "";
    await send(`[STEP c1 WRONG | child wrote: 3/4 + 1/6 = 4/10 | category: add_across | rung ${rung} | repeat ${rung}${action}]`);
  }
  session.close();
  return { calls, spoken };
}

async function main() {
  const n = Number(process.argv[2] ?? 4);
  let calls = 0, spoken = 0;
  for (let i = 1; i <= n; i++) { const r = await one(i).catch((e) => { console.log(`session ${i} ERR ${e.message}`); return { calls: 0, spoken: 0 }; }); calls += r.calls; spoken += r.spoken; console.log(`session ${i}: ${r.calls} real tool calls, ${r.spoken} turns with spoken tool syntax`); }
  console.log(`TOTAL over ${n} sessions (5 turns each): ${calls} real tool calls, ${spoken} spoken`);
}
main();
