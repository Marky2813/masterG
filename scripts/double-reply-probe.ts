// Does Masterji say his reply twice inside one turn? Drives the REAL MasterjiVoice (its notes, tool
// responses and transcript handling) against the live model; only the audio player and mic are absent
// (the child speaks as text). Every server message is recorded, so we can see where a second reply starts.
//   node --env-file=.env.local --import tsx scripts/double-reply-probe.ts <wrong|name|withheld> [samples=5]
// Conditions, each replaying a logged sequence:
//   wrong    : log 2026-11-01T03-48-58-r6vb: greeting, QUESTION SET 3/4 + 1/6, then STEP c1 WRONG 4/10 at rung 1
//   name     : scripts/opening-probe.ts: greeting with the homework question, then the child says name + class
//   withheld : log 2026-11-01T04-28-28-6j8t 4:34: 2x + 5 = 11, the child at 2x = 6 asks how to get x
//              (he tends to write "x = 3" -> the answer guard refuses it with ok:false mid-turn)
//   relink   : the OLD reconnect note from scripts/reconnect-probe.ts (turnComplete true), then "ek aur sawaal".
//              Not what the app sends any more; kept because it made him reply twice in 3 of 3 runs
//              (logs/probes/reconnect-1793499959064.json in the masterG-fix checkout), so it tests the cut.
import type { LiveServerMessage } from "@google/genai";
import { GoogleGenAI } from "@google/genai";
import { mkdirSync, writeFileSync } from "node:fs";
import { bus } from "../src/lib/bus";
import type { Verdict } from "../src/lib/types";
import { kindOf } from "../src/lib/brain/kind";
import "../src/lib/sessionState";
import { liveConfig } from "../src/lib/voice/liveConfig";
import { LIVE_MODEL } from "../src/lib/voice/config";
import { MasterjiVoice, restatedAt, sessionStartNote } from "../src/lib/voice/voiceService";

const mode = (process.argv[2] ?? "wrong") as "wrong" | "name" | "withheld" | "relink";
const n = Number(process.argv[3] ?? 5);
const tag = process.argv[4] ?? "";

// clientLog posts to /api/log: keep those events here.
let logged: { type: string; data: Record<string, unknown> }[] = [];
const realFetch = globalThis.fetch;
globalThis.fetch = (async (url: string | URL | Request, init?: RequestInit) => {
  if (String(url) === "/api/log") {
    if (typeof init?.body === "string") logged.push(JSON.parse(init.body));
    return new Response("{}");
  }
  return realFetch(url, init);
}) as typeof fetch;

const RELINK_HISTORY = [
  "you: Bilkul. Chalo, aage badho.",
  "you: Koi baat nahi, saath mein karte hain. Dekho, humein x ki value nikaalni hai na? Toh pehle +5 ko equal ke uss taraf le jaayenge.",
  "you: Haan, badhiya. Agla step batao.",
  "you: Ekdum sahi! Chalo, ab x nikaalo.",
  "you: Zaroor, dekho main graph bana diya hai. Dono lines kahan par milti hain dekho, x = 3 par!",
  "you: Bahut khoob, dekha, graph ne bhi wahi bataya! Shabash beta, tumhara saara homework khatam ho gaya! Aaj ke liye kaafi hai.",
  "child: Okay sir ji.",
  "you: Haan beta, chalo, ab rest karo. Milte hain agli class mein.",
];
const RELINK_OLD = `[RECONNECTED: the line dropped for a moment. Continue the SAME lesson; do NOT greet or ask the name again; say at most "Haan, main yahin hoon". Recent conversation: ${RELINK_HISTORY.join(" | ")}]\n[QUESTION SET: 2x + 5 = 11 (homework question 2 of 2)]`;

type Priv = {
  session: unknown;
  subscribe(): void;
  flushNotes(): void;
  onMessage(m: LiveServerMessage): void;
  replyOwedAt: number;
};

async function one(i: number) {
  logged = [];
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
  const v = new MasterjiVoice("hinglish");
  const priv = v as unknown as Priv;
  const t0 = performance.now();
  const raw: string[] = [];
  const heard: string[] = [""]; // the model's own transcript per turn, before voiceService touches it
  let turnDone: (() => void) | null = null;
  const session = await ai.live.connect({
    model: LIVE_MODEL,
    config: liveConfig("hinglish", undefined, mode === "relink" ? "Akash" : undefined),
    callbacks: {
      onmessage: (m: LiveServerMessage) => {
        const sc = m.serverContent;
        const bits = [
          sc?.modelTurn?.parts?.some((p) => p.inlineData) ? "audio" : "",
          sc?.outputTranscription?.text ? `said:${JSON.stringify(sc.outputTranscription.text)}` : "",
          m.toolCall ? `toolCall:${m.toolCall.functionCalls?.map((f) => `${f.name}${JSON.stringify(f.args)}`).join(",")}` : "",
          sc?.generationComplete ? "generationComplete" : "",
          sc?.interrupted ? "interrupted" : "",
          sc?.waitingForInput ? "waitingForInput" : "",
          sc?.turnComplete ? `turnComplete${sc.turnCompleteReason ? `(${sc.turnCompleteReason})` : ""}` : "",
        ].filter(Boolean);
        if (bits.length && !(bits.length === 1 && bits[0] === "audio")) raw.push(`${Math.round(performance.now() - t0)} ${bits.join(" ")}`);
        if (sc?.outputTranscription?.text) heard[heard.length - 1] += sc.outputTranscription.text;
        priv.onMessage(m);
        if (sc?.turnComplete) {
          heard.push("");
          turnDone?.();
        }
      },
    },
  });
  priv.session = {
    sendClientContent: (c: Parameters<typeof session.sendClientContent>[0]) => {
      raw.push(`${Math.round(performance.now() - t0)} >> clientContent turnComplete=${c.turnComplete} ${JSON.stringify(JSON.stringify(c.turns).slice(0, 80))}`);
      session.sendClientContent(c);
    },
    sendToolResponse: (r: Parameters<typeof session.sendToolResponse>[0]) => {
      raw.push(`${Math.round(performance.now() - t0)} >> toolResponse ${JSON.stringify(r.functionResponses).slice(0, 160)}`);
      session.sendToolResponse(r);
    },
    sendRealtimeInput: () => {},
    close: () => session.close(),
  };
  // name: the sum is set before he starts (as in the app, so no QUESTION SET note of its own)
  if (mode === "name") bus.emit("questionConfirmed", { text: "3/7 + 5/6", kind: kindOf("3/7 + 5/6") });
  if (mode === "relink") bus.emit("questionConfirmed", { text: "2x + 5 = 11", kind: kindOf("2x + 5 = 11") });
  priv.subscribe();
  const flusher = setInterval(() => priv.flushNotes(), 100);
  const waitTurn = () =>
    new Promise<void>((r) => {
      const to = setTimeout(() => {
        raw.push("TIMEOUT");
        r();
      }, 25000);
      turnDone = () => {
        clearTimeout(to);
        turnDone = null;
        setTimeout(r, 300);
      };
    });
  // A note goes through v.note() exactly as the app sends it; the child speaks as a text turn.
  const childSays = async (text: string) => {
    const w = waitTurn();
    priv.replyOwedAt = performance.now();
    session.sendClientContent({ turns: [{ role: "user", parts: [{ text }] }], turnComplete: true });
    raw.push(`${Math.round(performance.now() - t0)} >> child "${text}"`);
    await w;
  };
  const viaBus = async (fn: () => void) => {
    const w = waitTurn();
    fn();
    await w;
  };
  const verdict = (p: Partial<Verdict> & Pick<Verdict, "clusterId" | "status" | "text">) =>
    bus.emit("verdict", { mark: "none", repeatCount: 0, hintRung: 0, source: "checker", ...p } as Verdict);

  if (mode === "wrong") {
    await viaBus(() => v.note(sessionStartNote(undefined, undefined)));
    await childSays("Namaste master ji, mera naam Akash hai, saatvi class.");
    await viaBus(() => bus.emit("questionConfirmed", { text: "3/4 + 1/6", kind: kindOf("3/4 + 1/6") }));
    await viaBus(() =>
      verdict({ clusterId: "c1", status: "wrong", text: "3/4 + 1/6 = 4/10", category: "add_across", repeatCount: 1, hintRung: 1, hint: "The student added the numerators together and the denominators together instead of finding a common denominator." }),
    );
  } else if (mode === "name") {
    const { sessionState } = await import("../src/lib/sessionState");
    const qn = (v as unknown as { questionNote(t: string): string }).questionNote(sessionState.question!.text);
    await viaBus(() => v.note(sessionStartNote(undefined, qn)));
    await childSays("Namaste master ji, mera naam Akash hai, main saatvi class mein hoon.");
  } else if (mode === "relink") {
    await viaBus(() => v.note(RELINK_OLD));
    await childSays("Sir ji, ek aur sawaal de do?");
  } else {
    await viaBus(() => bus.emit("questionConfirmed", { text: "2x + 5 = 11", kind: kindOf("2x + 5 = 11") }));
    await childSays("Namaste master ji, main Akash, saatvi class.");
    await viaBus(() => verdict({ clusterId: "c2", status: "correct", text: "2x=11-5" }));
    await viaBus(() => verdict({ clusterId: "c3", status: "correct", text: "2x=6" }));
    await childSays("Sir, 2x = 6 tak toh aa gaye. Iske baad x ki value kaise nikalein? Board pe likh ke dikhao na.");
  }
  clearInterval(flusher);
  v.stop();
  const turns = logged.filter((l) => l.type === "voice.turn").map((l) => String(l.data.masterji ?? ""));
  const last = turns.at(-1) ?? "";
  const tools = logged.filter((l) => /voice\.(write_|set_question|draw_graph|show_counting)/.test(l.type)).map((l) => `${l.type.replace("voice.", "")}${l.data.duplicate ? "(dup)" : ""}${l.data.withheld ? "(withheld)" : ""}`);
  const withheld = logged.some((l) => l.type === "voice.answer_withheld");
  const cut = logged.filter((l) => l.type === "voice.restated_cut").length;
  const restated = turns.map((t) => restatedAt(t) >= 0); // what the app kept (caption, history)
  const modelTurns = heard.filter(Boolean);
  const modelRestated = modelTurns.map((t) => restatedAt(t) >= 0); // what the model generated
  console.log(`${mode} #${i}: model restated ${modelRestated.filter(Boolean).length}/${modelTurns.length} turns, app kept ${restated.filter(Boolean).length} restated, cut=${cut} tools=[${tools.join(",")}] withheld=${withheld}\n   last: ${JSON.stringify(last)}`);
  return { turns, restated, modelTurns, modelRestated, tools, withheld, cut, raw, logged };
}

(async () => {
  const runs: Awaited<ReturnType<typeof one>>[] = [];
  for (let i = 1; i <= n; i++) runs.push(await one(i));
  mkdirSync("logs/probes", { recursive: true });
  const file = `logs/probes/double-reply-${mode}${tag ? `-${tag}` : ""}-${Date.now()}.json`;
  writeFileSync(file, JSON.stringify({ model: LIVE_MODEL, mode, runs }, null, 2));
  const sum = (f: (r: (typeof runs)[number]) => number) => runs.reduce((a, r) => a + f(r), 0);
  console.log(`${mode}${tag ? ` [${tag}]` : ""}: model said a reply twice in ${sum((r) => r.modelRestated.filter(Boolean).length)}/${sum((r) => r.modelTurns.length)} turns (${runs.filter((r) => r.modelRestated.some(Boolean)).length}/${n} sessions); the app kept it twice in ${sum((r) => r.restated.filter(Boolean).length)}/${sum((r) => r.turns.length)} turns; withheld in ${runs.filter((r) => r.withheld).length}/${n}; cut ${runs.reduce((a, r) => a + r.cut, 0)}  -> ${file}`);
  process.exit(0);
})();
