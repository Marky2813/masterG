// The opening: does he greet and ask only name + class (no sum yet), then bring up the sum after the
// child answers? Same note voiceService sends (sessionStartNote), live model, text in / transcript out.
//   node --env-file=.env.local --import tsx scripts/opening-probe.ts [samples=3]
import { GoogleGenAI, type LiveServerMessage } from "@google/genai";
import { mkdirSync, writeFileSync } from "node:fs";
import { liveConfig } from "../src/lib/voice/liveConfig";
import { LIVE_MODEL } from "../src/lib/voice/config";
import { questionFacts } from "../src/lib/brain/facts";
import { sessionStartNote } from "../src/lib/voice/voiceService";

const n = Number(process.argv[2] ?? 3);
const Q = "3/7 + 5/6";
const qNote = `[QUESTION SET: ${Q} (homework question 1 of 2)]\n[FACTS (computed, correct; copy these when writing): ${questionFacts(Q).join(" ; ")}]`;
const mentionsSum = (s: string) => /3\s*\/\s*7|5\s*\/\s*6|sawaal|question|sum\b|homework/i.test(s);

async function one() {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
  let said = "";
  let turnDone!: () => void;
  let wait = new Promise<void>((r) => (turnDone = r));
  const session = await ai.live.connect({
    model: LIVE_MODEL,
    config: liveConfig("hinglish"),
    callbacks: {
      onmessage: (m: LiveServerMessage) => {
        if (m.serverContent?.outputTranscription?.text) said += m.serverContent.outputTranscription.text;
        if (m.serverContent?.turnComplete) turnDone();
        for (const fc of m.toolCall?.functionCalls ?? []) session.sendToolResponse({ functionResponses: { id: fc.id, name: fc.name, response: { ok: true } } });
      },
    },
  });
  const timeout = () => new Promise<void>((r) => setTimeout(r, 20000));
  session.sendClientContent({ turns: [{ role: "user", parts: [{ text: sessionStartNote(undefined, qNote) }] }], turnComplete: true });
  await Promise.race([wait, timeout()]);
  const first = said.trim();
  said = "";
  wait = new Promise<void>((r) => (turnDone = r));
  session.sendClientContent({ turns: [{ role: "user", parts: [{ text: "Namaste master ji, mera naam Akash hai, main saatvi class mein hoon." }] }], turnComplete: true });
  await Promise.race([wait, timeout()]);
  const second = said.trim();
  session.close();
  return { first, second, firstAsksName: /naam|name/i.test(first), firstMentionsSum: mentionsSum(first), secondMentionsSum: mentionsSum(second) };
}

(async () => {
  const runs = [];
  for (let i = 0; i < n; i++) {
    const r = await one();
    runs.push(r);
    console.log(`${i + 1}. greeting: "${r.first}"\n   after name: "${r.second}"`);
  }
  mkdirSync("logs/probes", { recursive: true });
  writeFileSync(`logs/probes/opening-${Date.now()}.json`, JSON.stringify({ model: LIVE_MODEL, runs }, null, 2));
  console.log(`greeting asks the name ${runs.filter((r) => r.firstAsksName).length}/${n}; greeting mentions the sum ${runs.filter((r) => r.firstMentionsSum).length}/${n}; sum brought up after the name ${runs.filter((r) => r.secondMentionsSum).length}/${n}`);
})();
