// Does Masterji follow the teacher's homework? Real Live model, real persona + tools. Sends the same
// notes voiceService builds with homework loaded (QUESTION SET tag, FINAL ANSWER + HOMEWORK NEXT,
// HOMEWORK DONE) and answers set_question exactly like voiceService's homework guard.
// Child turns are typed text standing in for speech (labelled CHILD in the output).
//   node --env-file=.env.local --import tsx scripts/homework-probe.ts
// Output: stdout and logs/probe/homework-<time>.txt
import { mkdirSync, writeFileSync } from "node:fs";
import { GoogleGenAI, type LiveServerMessage, type Session } from "@google/genai";
import { liveConfig } from "../src/lib/voice/liveConfig";
import { LIVE_MODEL } from "../src/lib/voice/config";
import { questionFacts } from "../src/lib/brain/facts";

const HW = ["2/3 + 1/7", "3/10 + 7/15", "5/6 - 2/9"];
let current = 0;
const done = new Set<number>();
const out: string[] = [];
const log = (s: string) => {
  console.log(s);
  out.push(s);
};
const norm = (s: string) => s.replace(/\s+/g, "").toLowerCase();
const nextHw = () => [...HW.keys()].filter((i) => i !== current && !done.has(i)).sort((a, b) => (a <= current ? 1 : 0) - (b <= current ? 1 : 0) || a - b)[0];
const facts = (q: string) => questionFacts(q).join(" ; ");
const finalNote = (wrote: string) => {
  done.add(current);
  const n = nextHw();
  const tail =
    n !== undefined
      ? `tell them the next sum is from their teacher's homework. [HOMEWORK NEXT (${n + 1} of ${HW.length}): ${HW[n]}] When the child is ready, put exactly this on the board with the question tool.`
      : `tell them ALL the teacher's homework is done (all ${HW.length} questions): celebrate it! [HOMEWORK DONE] Don't set a new sum unless the child asks for one.`;
  return `[FINAL ANSWER CORRECT | child wrote: ${wrote} | first try] Praise warmly in one or two sentences, then ${tail}`;
};

async function main() {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
  let said = "";
  let done_!: () => void;
  const followUps: string[] = [];
  const wait = () =>
    new Promise<void>((r) => {
      done_ = r;
      setTimeout(r, 25000);
    });
  const session: Session = await ai.live.connect({
    model: LIVE_MODEL,
    config: liveConfig("hinglish"),
    callbacks: {
      onmessage: (m: LiveServerMessage) => {
        if (m.serverContent?.outputTranscription?.text) said += m.serverContent.outputTranscription.text;
        for (const fc of m.toolCall?.functionCalls ?? []) {
          log(`   TOOL ${fc.name} ${JSON.stringify(fc.args)}`);
          let response: Record<string, unknown> = { ok: true };
          if (fc.name === "set_question") {
            const asked = String((fc.args as { question?: string }).question ?? "");
            const n = nextHw();
            const named = HW.findIndex((q) => norm(q) === norm(asked));
            if (named >= 0) current = named;
            else if (n !== undefined && !done.has(current)) {
              response = { ok: false, note: `Not changed: the board still has the teacher's homework question ${current + 1} of ${HW.length} (${HW[current]}) and it isn't finished. Help the child finish it first. If they really have finished it, put the next homework question instead: ${HW[n]}. Don't set your own sums while homework is left.` };
              log(`   GUARD kept the board on "${HW[current]}" (asked "${asked}")`);
              session.sendToolResponse({ functionResponses: { id: fc.id, name: fc.name, response } });
              continue;
            } else if (n !== undefined) {
              current = n;
              response = { ok: true, onBoard: HW[n], note: `Homework comes first: the board now shows the teacher's homework question ${n + 1} of ${HW.length} (${HW[n]}), not your sum. Read this one out; don't set your own sums while homework is left.` };
              log(`   GUARD swapped "${asked}" -> "${HW[n]}"`);
            }
            if (named >= 0 || n !== undefined)
              followUps.push(`[FACTS for the sum you just put on the board (homework question ${current + 1} of ${HW.length}) (copy these when writing): ${facts(HW[current])}] It is on the board now; don't set it again.`);
          }
          session.sendToolResponse({ functionResponses: { id: fc.id, name: fc.name, response } });
        }
        if (m.serverContent?.turnComplete) {
          log(`   SAID "${said.trim()}"`);
          said = "";
          done_();
        }
      },
    },
  });
  const send = async (label: string, text: string) => {
    log(`> ${label}: ${text.slice(0, 220)}`);
    const w = wait();
    session.sendClientContent({ turns: [{ role: "user", parts: [{ text }] }], turnComplete: true });
    await w;
    while (followUps.length) {
      const f = followUps.shift()!;
      log(`> (voiceService follow-up) ${f.slice(0, 160)}`);
      const w2 = wait();
      session.sendClientContent({ turns: [{ role: "user", parts: [{ text: f }] }], turnComplete: true });
      await w2;
    }
  };

  log(`model ${LIVE_MODEL} | homework ${JSON.stringify(HW)} | ${new Date().toISOString()}`);
  await send("start", `[SESSION START] Greet the child and ask their name.\n[QUESTION SET: ${HW[0]} (homework question 1 of 3)]\n[FACTS (computed, correct; copy these when writing): ${facts(HW[0])}]`);
  await send("CHILD", "Main Aarav, class 6.");
  if (process.argv[2] === "guard") {
    // The child names their own sum while homework is left: the set_question guard should swap it.
    await send("CHILD", "Masterji, ye homework baad mein. Pehle board pe ye sum lagao: 2.5 + 1.25");
    await send("CHILD", "Theek hai, kar raha hoon.");
    return finish(session);
  }
  await send("final q1", finalNote("17/21"));
  await send("CHILD", "Haan Masterji, ready hoon. Agla do.");
  // Provoke the guard: the child asks for something else while homework is left.
  await send("final q2", finalNote("23/30"));
  await send("CHILD", "Masterji, ab aap apni marzi ka koi mushkil sum do na, decimals wala.");
  await send("final q3", finalNote("11/18"));
  finish(session);
}

function finish(session: Session) {
  session.close();
  mkdirSync("logs/probe", { recursive: true });
  const file = `logs/probe/homework-${process.argv[2] ?? "follow"}-${new Date().toISOString().replace(/[:.]/g, "-")}.txt`;
  writeFileSync(file, out.join("\n") + "\n");
  console.log(`\nwrote ${file}`);
}
main();
