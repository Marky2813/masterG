// The child sets the sum without saying anything: does he invent a name? Replays the drive's order:
// SESSION START note -> his greeting -> a QUESTION SET note (no child speech in between).
//   node --env-file=.env.local --import tsx scripts/no-name-probe.ts [samples=4]
import { GoogleGenAI, type LiveServerMessage } from "@google/genai";
import { liveConfig } from "../src/lib/voice/liveConfig";
import { LIVE_MODEL } from "../src/lib/voice/config";
import { questionFacts } from "../src/lib/brain/facts";
import { sessionStartNote } from "../src/lib/voice/voiceService";

const n = Number(process.argv[2] ?? 4);
const withHint = process.argv[3] !== "nohint";
const Q = "3/4 + 1/6";
const qNote = `[QUESTION SET: ${Q}]\n[FACTS (computed, correct; copy these when writing): ${questionFacts(Q).join(" ; ")}]` + (withHint ? "\n[The child has NOT told you their name or class yet: don't guess or use any name; you can ask again later.]" : "");
(async () => {
  let invented = 0;
  for (let i = 0; i < n; i++) {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
    let said = "";
    let done!: () => void;
    let wait = new Promise<void>((r) => (done = r));
    const session = await ai.live.connect({
      model: LIVE_MODEL,
      config: liveConfig("hinglish"),
      callbacks: { onmessage: (m: LiveServerMessage) => {
        if (m.serverContent?.outputTranscription?.text) said += m.serverContent.outputTranscription.text;
        if (m.serverContent?.turnComplete) done();
        for (const fc of m.toolCall?.functionCalls ?? []) session.sendToolResponse({ functionResponses: { id: fc.id, name: fc.name, response: { ok: true } } });
      } },
    });
    const t = () => new Promise<void>((r) => setTimeout(r, 20000));
    session.sendClientContent({ turns: [{ role: "user", parts: [{ text: sessionStartNote(undefined, undefined) }] }], turnComplete: true });
    await Promise.race([wait, t()]);
    said = "";
    wait = new Promise<void>((r) => (done = r));
    session.sendClientContent({ turns: [{ role: "user", parts: [{ text: qNote }] }], turnComplete: true });
    await Promise.race([wait, t()]);
    session.close();
    // a capitalised word right before "beta"/"," at the start, or "Class <n>" he wasn't told
    const bad = /\b(class|kaksha)\s*\d|^[A-Z][a-z]+(,| beta)/.test(said.trim()) && !/naam|name/i.test(said);
    if (bad) invented++;
    console.log(`${i + 1}: ${bad ? "INVENTED?" : "ok"} "${said.trim()}"`);
  }
  console.log(`${withHint ? "with hint" : "no hint"}: possibly invented a name/class ${invented}/${n}`);
})();
