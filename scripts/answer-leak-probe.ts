// Early-answer leak probe for the graph and counting tools: a stuck child, the tool result exactly as
// voiceService returns it (with the "let the child read it" note). Does he announce the answer?
//   node --env-file=.env.local --import tsx scripts/answer-leak-probe.ts <count|graph> [samples=3]
import {
  GoogleGenAI,
  type LiveServerMessage,
  type Session,
} from "@google/genai";
import { writeFileSync, mkdirSync } from "node:fs";
import { liveConfig } from "../src/lib/voice/liveConfig";
import { LIVE_MODEL } from "../src/lib/voice/config";
import { questionFacts } from "../src/lib/brain/facts";

const mode = process.argv[2] ?? "count";
const n = Number(process.argv[3] ?? 3);
const Q = mode === "count" ? "2 + 3" : "3x + 5 = 20";
const ANSWER =
  mode === "count"
    ? /\b(5|paanch|five)\b(?!.*\?)/i
    : /x\s*=\s*5|5 par|answer.*5|5.*answer/i;

async function one(i: number) {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
  let said = "";
  const turns: string[] = [];
  let done!: () => void;
  const wait = () =>
    new Promise<void>((r) => {
      done = r;
      setTimeout(r, 20000);
    });
  const session: Session = await ai.live.connect({
    model: LIVE_MODEL,
    config: liveConfig("hinglish"),
    callbacks: {
      onmessage: (m: LiveServerMessage) => {
        if (m.serverContent?.outputTranscription?.text)
          said += m.serverContent.outputTranscription.text;
        for (const fc of m.toolCall?.functionCalls ?? []) {
          turns.push(`TOOL ${fc.name} ${JSON.stringify(fc.args)}`);
          const response =
            fc.name === "show_counting"
              ? {
                  ok: true,
                  drawn: "2 + 3 as sticks, counted one by one",
                  answer: 5,
                  note: "Count along slowly, then ask the child how many there are in total. Let the child say the total first; only confirm it after they say it.",
                }
              : fc.name === "draw_graph"
                ? {
                    ok: true,
                    drawn: ["y = 3x + 5", "y = 20"],
                    crossesAt: 5,
                    note: 'If you mention the crossing, use exactly this number. Unless the child has already solved it or is at rung 4, don\'t announce it as the answer: ask the child to read where the lines meet ("Dekho, lines kahaan mil rahi hain? x kitna hai?").',
                  }
                : { ok: true };
          session.sendToolResponse({
            functionResponses: { id: fc.id, name: fc.name, response },
          });
        }
        if (m.serverContent?.turnComplete) {
          turns.push(`SAID "${said.trim()}"`);
          said = "";
          done();
        }
      },
    },
  });
  const send = async (text: string) => {
    const w = wait();
    session.sendClientContent({
      turns: [{ role: "user", parts: [{ text }] }],
      turnComplete: true,
    });
    await w;
  };
  await send(
    `[SESSION START] Greet the child and ask their name and class.\n[QUESTION SET: ${Q}]\n[FACTS (computed, correct; copy these when writing): ${questionFacts(Q).join(" ; ")}]`,
  );
  await send(
    mode === "count"
      ? '[The child (Class 1) said: "mujhe nahi aata, sticks se dikhao"]\n[STEP c1 STILL WRONG | child wrote: 2 + 3 = 7 | rung 2 | repeat 1]'
      : '[The child (Class 7) said: "graph bana ke dikhao"]\n[STEP c1 STILL WRONG | child wrote: 3x = 25 | rung 2 | repeat 1]',
  );
  session.close();
  const after = turns
    .slice(1)
    .filter((t) => t.startsWith("SAID"))
    .join(" ");
  const leaked = ANSWER.test(
    after.replace(/ek, do, teen, chaar, paanch/gi, ""),
  );
  console.log(
    `${mode} #${i}: leaked=${leaked}  ${turns.slice(1).join(" | ").slice(0, 400)}`,
  );
  return { turns, leaked };
}

(async () => {
  mkdirSync("logs/probe", { recursive: true });
  const res = [];
  for (let i = 1; i <= n; i++) res.push(await one(i));
  writeFileSync(
    `logs/probe/answer-leak-${mode}.json`,
    JSON.stringify(res, null, 2),
  );
  console.log(`${mode}: leaked ${res.filter((r) => r.leaked).length}/${n}`);
})();
