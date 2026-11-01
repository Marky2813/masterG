// After a dropped line, does Masterji speak by himself? Replays the handover from log
// 2026-11-01T02-14-07-do7a (homework done, kid said "Okay sir ji", 2.5 min idle, 1008, reconnect):
//   old: the RECONNECTED note sent as a normal note (turnComplete true)
//   new: reconnectContext() sent as context only (turnComplete false), as voiceService does now
// Then the child speaks (as text) and we check the reply doesn't greet or repeat his old lines.
//   node --env-file=.env.local --import tsx scripts/reconnect-probe.ts [samples=3]
import { GoogleGenAI, type LiveServerMessage } from "@google/genai";
import { mkdirSync, writeFileSync } from "node:fs";
import { liveConfig } from "../src/lib/voice/liveConfig";
import { LIVE_MODEL } from "../src/lib/voice/config";
import { reconnectContext } from "../src/lib/voice/voiceService";

const n = Number(process.argv[2] ?? 3);
const HISTORY = [
  "you: Bilkul. Chalo, aage badho.",
  "you: Koi baat nahi, saath mein karte hain. Dekho, humein x ki value nikaalni hai na? Toh pehle +5 ko equal ke uss taraf le jaayenge.",
  "you: Haan, badhiya. Agla step batao.",
  "you: Ekdum sahi! Chalo, ab x nikaalo.",
  "you: Zaroor, dekho main graph bana diya hai. Dono lines kahan par milti hain dekho, x = 3 par!",
  "you: Bahut khoob, dekha, graph ne bhi wahi bataya! Shabash beta, tumhara saara homework khatam ho gaya! Aaj ke liye kaafi hai.",
  "child: Okay sir ji.",
  "you: Haan beta, chalo, ab rest karo. Milte hain agli class mein.",
];
const Q = "2x + 5 = 11";
const qNote = (q: string) => `[QUESTION SET: ${q} (homework question 2 of 2)]`;
const OLD = `[RECONNECTED: the line dropped for a moment. Continue the SAME lesson; do NOT greet or ask the name again; say at most "Haan, main yahin hoon". Recent conversation: ${HISTORY.join(" | ")}]\n${qNote(Q)}`;

async function one(mode: "old" | "new") {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
  let said = "";
  let audioChunks = 0;
  const tools: string[] = [];
  let mark = 0;
  const session = await ai.live.connect({
    model: LIVE_MODEL,
    config: liveConfig("hinglish", undefined, "Akash"),
    callbacks: {
      onmessage: (m: LiveServerMessage) => {
        if (m.serverContent?.outputTranscription?.text) said += m.serverContent.outputTranscription.text;
        if (m.serverContent?.modelTurn?.parts?.some((p) => p.inlineData)) audioChunks++;
        for (const fc of m.toolCall?.functionCalls ?? []) {
          tools.push(fc.name ?? "");
          session.sendToolResponse({ functionResponses: { id: fc.id, name: fc.name, response: { ok: false, reason: "already set" } } });
        }
      },
    },
  });
  if (mode === "old") session.sendClientContent({ turns: [{ role: "user", parts: [{ text: OLD }] }], turnComplete: true });
  else session.sendClientContent({ turns: [{ role: "user", parts: [{ text: reconnectContext(HISTORY, Q, qNote, true) }] }], turnComplete: false });
  await new Promise((r) => setTimeout(r, 10000));
  const unprompted = { said: said.trim(), audioChunks, tools: [...tools] };
  mark = said.length;
  session.sendClientContent({ turns: [{ role: "user", parts: [{ text: "Sir ji, ek aur sawaal de do?" }] }], turnComplete: true });
  await new Promise((r) => setTimeout(r, 10000));
  session.close();
  const reply = said.slice(mark).trim();
  return { mode, unprompted, reply, replyGreets: /namaste|hello|naam/i.test(reply), replyRepeats: /rest karo|graph ne bhi|milte hain/i.test(reply), offersSolved: /2x\s*\+\s*5\s*=\s*11/i.test(reply) };
}

(async () => {
  const runs = [];
  for (const mode of ["old", "new"] as const)
    for (let i = 0; i < n; i++) {
      const r = await one(mode);
      runs.push(r);
      console.log(`${mode} ${i + 1}: spoke unprompted=${r.unprompted.audioChunks > 0} (${r.unprompted.audioChunks} chunks, tools ${r.unprompted.tools.join(",") || "-"}) "${r.unprompted.said.slice(0, 90)}" | after kid: "${r.reply.slice(0, 110)}" greets=${r.replyGreets} repeats=${r.replyRepeats} offersSolved=${r.offersSolved}`);
    }
  mkdirSync("logs/probes", { recursive: true });
  writeFileSync(`logs/probes/reconnect-${Date.now()}.json`, JSON.stringify({ model: LIVE_MODEL, runs }, null, 2));
  for (const mode of ["old", "new"]) {
    const rs = runs.filter((r) => r.mode === mode);
    console.log(`${mode}: spoke unprompted ${rs.filter((r) => r.unprompted.audioChunks > 0).length}/${rs.length}; reply after kid greeted ${rs.filter((r) => r.replyGreets).length}, repeated ${rs.filter((r) => r.replyRepeats).length}, offered the solved sum ${rs.filter((r) => r.offersSolved).length}, empty ${rs.filter((r) => !r.reply).length}`);
  }
})();
