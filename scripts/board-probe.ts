// Does Masterji write on the board? Feeds the question + facts, then a wrong step at rungs 1-4,
// and prints every write_note / write_line call with what he said.
// node --env-file=.env.local --import tsx scripts/board-probe.ts
import { GoogleGenAI, type LiveServerMessage, type Session } from "@google/genai";
import { liveConfig } from "../src/lib/voice/liveConfig";
import { LIVE_MODEL } from "../src/lib/voice/config";
import { questionFacts } from "../src/lib/brain/facts";
async function main() {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
  let said = ""; let done!: () => void;
  const wait = () => new Promise<void>((r) => { done = r; setTimeout(r, 20000); });
  const session: Session = await ai.live.connect({ model: LIVE_MODEL, config: liveConfig("hinglish"), callbacks: {
    onmessage: (m: LiveServerMessage) => {
      if (m.serverContent?.outputTranscription?.text) said += m.serverContent.outputTranscription.text;
      for (const fc of m.toolCall?.functionCalls ?? []) {
        console.log(`   TOOL ${fc.name} ${JSON.stringify(fc.args)}`);
        session.sendToolResponse({ functionResponses: { id: fc.id, name: fc.name, response: { ok: true } } });
      }
      if (m.serverContent?.turnComplete) { console.log(`   SAID "${said.trim()}"`); said = ""; done(); }
    } } });
  const send = async (label: string, text: string) => { console.log(`> ${label}`); const w = wait(); session.sendClientContent({ turns: [{ role: "user", parts: [{ text }] }], turnComplete: true }); await w; };
  const q = "3/4 + 1/6";
  await send("start", `[SESSION START] Greet the child and ask their name.\n[QUESTION SET: ${q}]\n[FACTS (computed, correct; copy these when writing): ${questionFacts(q).join(" ; ")}]`);
  await send("wrong rung 1", "[STEP c1 WRONG | child wrote: 3/4 + 1/6 = 4/10 | category: add_across | rung 1 | repeat 1]");
  await send("correct new line", "[STEP c2 CORRECT NOW | child wrote: 9/12 + 2/12] Short praise, then let them continue.");
  await send("final", "[FINAL ANSWER CORRECT | child wrote: 11/12 | after fixing a mistake: praise the effort] Praise warmly in one or two sentences, then ask if they want the next sum.");
  session.close();
}
main();
