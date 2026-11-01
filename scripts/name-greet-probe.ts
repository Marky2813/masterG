// Does Masterji greet a child who joined a class by name, without asking for it?
// Same config and SESSION START note as voiceService sends when a class membership exists.
//   node --env-file=.env.local --import tsx scripts/name-greet-probe.ts [samples=3]
import { GoogleGenAI, type LiveServerMessage } from "@google/genai";
import { mkdirSync, writeFileSync } from "node:fs";
import { liveConfig, safeKidName } from "../src/lib/voice/liveConfig";
import { LIVE_MODEL } from "../src/lib/voice/config";

const n = Number(process.argv[2] ?? 3);
const NAME = safeKidName("Aarav")!;

async function one() {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
  let said = "";
  let done!: () => void;
  const finished = new Promise<void>((r) => {
    done = r;
    setTimeout(r, 20000);
  });
  const session = await ai.live.connect({
    model: LIVE_MODEL,
    config: liveConfig("hinglish", undefined, NAME),
    callbacks: {
      onmessage: (m: LiveServerMessage) => {
        if (m.serverContent?.outputTranscription?.text) said += m.serverContent.outputTranscription.text;
        if (m.serverContent?.turnComplete) done();
      },
    },
  });
  session.sendClientContent({ turns: [{ role: "user", parts: [{ text: `[SESSION START] Greet ${NAME} by name (you already know it; don't ask).` }] }], turnComplete: true });
  await finished;
  session.close();
  return { said: said.trim(), usesName: /aarav/i.test(said), asksName: /(naam|name)\s*(kya|batao|bataiye|what)|what('?s| is) your name|aapka naam|tumhara naam/i.test(said) };
}

(async () => {
  const runs = [];
  for (let i = 0; i < n; i++) {
    const r = await one();
    runs.push(r);
    console.log(`${i + 1}: name=${r.usesName} asks=${r.asksName} | ${r.said}`);
  }
  mkdirSync("logs/probes", { recursive: true });
  writeFileSync(`logs/probes/name-greet-${Date.now()}.json`, JSON.stringify({ model: LIVE_MODEL, runs }, null, 2));
  console.log(`used the name ${runs.filter((r) => r.usesName).length}/${n}; asked for the name ${runs.filter((r) => r.asksName).length}/${n}`);
})();
