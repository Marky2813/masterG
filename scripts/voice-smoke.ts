// npm run test:voice: the voice service's note/tool rules, replayed on verdicts and tool calls recorded in
// real session logs (ids below). No model here: the "session" only records what we would have sent it.
import type { LiveServerMessage } from "@google/genai";
import { bus } from "../src/lib/bus";
import type { Verdict } from "../src/lib/types";
import { kindOf } from "../src/lib/brain/kind";
import "../src/lib/sessionState";
import { MasterjiVoice, spokenClean } from "../src/lib/voice/voiceService";

// clientLog posts to /api/log: keep those events here instead.
const logged: { type: string; data: Record<string, unknown> }[] = [];
globalThis.fetch = (async (_url: string, init?: { body?: string }) => {
  if (init?.body) logged.push(JSON.parse(init.body));
  return new Response("{}");
}) as typeof fetch;

let failed = 0;
const ok = (cond: boolean, what: string) => {
  console.log(`${cond ? "PASS" : "FAIL"}  ${what}`);
  if (!cond) failed++;
};

type Sent = { kind: "note" | "tool"; text?: string; response?: Record<string, unknown> };
function harness() {
  const sent: Sent[] = [];
  const board: string[] = [];
  const v = new MasterjiVoice("hinglish");
  const priv = v as unknown as { session: unknown; subscribe(): void; flushNotes(): void; onMessage(m: LiveServerMessage): void };
  priv.session = {
    sendClientContent: (c: { turns: { parts: { text: string }[] }[]; turnComplete: boolean }) => c.turnComplete && sent.push({ kind: "note", text: c.turns[0].parts[0].text }),
    sendToolResponse: (r: { functionResponses: { response: Record<string, unknown> } }) => sent.push({ kind: "tool", response: r.functionResponses.response }),
    sendRealtimeInput: () => {},
    close: () => {},
  };
  priv.subscribe();
  const offs = [bus.on("writeNote", ({ text }) => board.push(text)), bus.on("writeLine", ({ text }) => board.push(text))];
  let id = 0;
  return {
    v,
    sent,
    board,
    question: (text: string) => bus.emit("questionConfirmed", { text, kind: kindOf(text) }),
    verdict: (p: Partial<Verdict> & Pick<Verdict, "clusterId" | "status" | "text">) =>
      bus.emit("verdict", { mark: "none", repeatCount: 0, hintRung: 0, source: "checker", ...p } as Verdict),
    tool: (name: string, args: Record<string, unknown>) => priv.onMessage({ toolCall: { functionCalls: [{ id: `f${++id}`, name, args }] } } as LiveServerMessage),
    turn: (said = "") => {
      if (said) priv.onMessage({ serverContent: { outputTranscription: { text: said } } } as LiveServerMessage);
      priv.onMessage({ serverContent: { turnComplete: true } } as LiveServerMessage);
      priv.flushNotes();
    },
    lastTool: () => [...sent].reverse().find((s) => s.kind === "tool")?.response ?? {},
    notes: () => sent.filter((s) => s.kind === "note").map((s) => s.text ?? ""),
    done: () => {
      offs.forEach((o) => o());
      v.stop();
    },
  };
}

async function main() {
// ---- log 2026-10-31T20-06-47-7x1t: 2 + 3 for a Class 1 child ----
{
  const h = harness();
  h.question("8x + 2y = 4, 3x + y = 1");
  h.turn("Namaste beta!");
  h.verdict({ clusterId: "c2", status: "correct", text: "3x-3x+1=1" });
  h.turn("Theek hai, karte raho.");
  const before = h.notes().length;
  h.verdict({ clusterId: "c2", status: "correct", text: "3x-3x+1=1" }); // re-judged, same text (+179.1 s)
  ok(h.notes().length === before, "re-judged correct step is not praised again");
  h.verdict({ clusterId: "c3", status: "correct", text: "1=1" });
  ok(/not again: "Theek hai, karte raho\."/.test(h.notes().at(-1) ?? ""), "next praise note lists his last praise so he picks new words");
  h.turn("Dek dek! Bilkul sahi ja rahe ho!");

  // He sets the next sum himself (+217.9 s). Old code sent a FACTS note right here, before the tool
  // response: the server cut his turn off and he called set_question again.
  const n0 = h.sent.length;
  h.tool("set_question", { question: "2 + 3" });
  ok(h.sent.length === n0 + 1 && h.sent[n0].kind === "tool", "set_question: only a tool response is sent (no note mid-call)");
  const facts = (h.lastTool().facts as string[]) ?? [];
  ok(h.lastTool().ok === true && facts.some((f) => f.includes("2 + 3 = 5")), "set_question response carries the FACTS");
  h.tool("set_question", { question: "2 + 3" });
  ok(h.lastTool().ok === false, "a repeated set_question is refused");
  h.turn("Chalo Akash, batao, 2 + 3 kitna hota hai?");

  h.verdict({ clusterId: "c4", status: "wrong", text: "2+3=7", category: "table_slip", repeatCount: 1, hintRung: 1, hint: "2 plus 3 is 5, not 7." });
  ok(!/2 plus 3 is 5/.test(h.notes().at(-1) ?? "") && /STEP c4 WRONG/.test(h.notes().at(-1) ?? ""), "rung 1 note drops a hint that contains the answer");
  h.turn("Arre nahi, Akash! 7 nahi hota. Dobara gino.");
  // "nahi aata" -> the same step re-sent at rung 2 (+260.6 s)
  h.verdict({ clusterId: "c4", status: "wrong", text: "2+3=7", category: "table_slip", repeatCount: 1, hintRung: 2 });
  const stuck = h.notes().at(-1) ?? "";
  ok(/STILL WRONG/.test(stuck) && !/\| repeat \d/.test(stuck), "stuck re-send is labelled STILL WRONG, not a repeat");
  const b0 = h.board.length;
  h.tool("write_note", { clusterId: "c4", text: "2 + 3 = 5" }); // what he wrote at rung 2 (+262.0 s)
  ok(h.board.length === b0 && h.lastTool().ok === false, "rung 2: note '2 + 3 = 5' is refused");
  h.tool("write_working", { lines: ["Line 1: 1, 2", "Line 2: 1, 2, 3"] });
  ok(h.board.length === b0 + 2 && h.lastTool().ok === true, "rung 2: counting working without the answer is written");
  h.turn();
  h.verdict({ clusterId: "c4", status: "wrong", text: "2+3=7", category: "table_slip", repeatCount: 1, hintRung: 4 });
  h.tool("write_line", { text: "2 + 3 = 5" });
  ok(h.board.at(-1) === "2 + 3 = 5", "rung 4: the correct step may be written");
  h.turn();

  // Next sum 3 + 4: "Final answer = 7" inside a working before the child wrote anything (+380.1 s)
  h.tool("set_question", { question: "3 + 4" });
  h.turn();
  const b1 = h.board.length;
  h.tool("write_working", { lines: ["Line banayi taaki hum count kar sake.", "Lines ginon: 1, 2, 3... plus 1, 2, 3, 4.", "Total 7 lines! Final answer = 7."] });
  ok(h.board.length === b1 + 2 && !h.board.slice(b1).some((l) => /7 lines/.test(l)), "answer line left out of a working, method lines kept");
  ok(h.lastTool().ok === true && /left out/.test(String(h.lastTool().note)), "response tells him the answer line was left out");
  h.turn();
  h.verdict({ clusterId: "c5", status: "correct", text: "3+4=7" });
  h.turn("Shabash!");
  h.tool("write_line", { text: "3 + 4 = 7" });
  ok(h.board.at(-1) === "3 + 4 = 7", "after the child wrote the answer he may write it");
  h.done();
}

// ---- log 2026-10-31T19-03-20-oho0: the answer re-written twice got three celebrations ----
{
  const h = harness();
  h.question("224 + 32");
  h.turn("Namaste, beta!");
  h.verdict({ clusterId: "c4", status: "wrong", text: "224+32=7", category: "carry_forgot", repeatCount: 1, hintRung: 1, hint: "The student added the units column incorrectly (4+2=7 instead of 6)." });
  ok(/hint: The student added the units/.test(h.notes().at(-1) ?? ""), "a hint without the answer is kept");
  h.turn();
  h.verdict({ clusterId: "c5", status: "correct", text: "224+32=256" });
  h.turn("Shabash!");
  h.verdict({ clusterId: "c6", status: "correct", text: "256" });
  h.verdict({ clusterId: "c7", status: "correct", text: "256" });
  ok(h.notes().filter((n) => n.includes("FINAL ANSWER CORRECT")).length === 1, "final answer celebrated once, copies go quietly");
  h.done();
}

// ---- log 2026-10-31T18-44-20-u1km: the golden path 3/4 + 1/6 is unchanged ----
{
  const h = harness();
  h.question("3/4 + 1/6");
  h.turn("Namaste beta");
  h.verdict({ clusterId: "c2", status: "wrong", text: "3/4 + 1/6 = (3+1)/(4+6)", category: "add_across", repeatCount: 1, hintRung: 1, hint: "The student added the numerators and denominators directly instead of finding a common denominator." });
  ok(/hint: The student added/.test(h.notes().at(-1) ?? ""), "golden path rung 1 note keeps its hint");
  const b0 = h.board.length;
  h.tool("write_note", { clusterId: "c2", text: "Dhyan se!" });
  h.turn();
  h.tool("write_working", { title: "LCM method replacement", lines: ["Multiples of 4: 4, 8, 12", "Multiples of 6: 6, 12", "LCM = 12"] });
  h.tool("write_note", { clusterId: "c2", text: "3/4 = 9/12" });
  h.tool("write_line", { text: "3/4 + 1/6 = 9/12 + 2/12" });
  ok(h.board.length === b0 + 7, "golden path: every method write goes on the board (LCM working, 3/4 = 9/12, 9/12 + 2/12)");
  h.tool("write_line", { text: "9/12 + 2/12 = 11/12" });
  ok(h.board.length === b0 + 7 && h.lastTool().ok === false, "golden path: '= 11/12' is held back at rung 1");
  h.turn();
  h.verdict({ clusterId: "c3", status: "correct", text: "(3*3+1*2)/12" });
  ok(/CORRECT NOW/.test(h.notes().at(-1) ?? ""), "fixed step still gets CORRECT NOW");
  h.turn("Shabash!");
  h.verdict({ clusterId: "c6", status: "correct", text: "11/12" });
  ok(/FINAL ANSWER CORRECT .*after fixing a mistake/.test(h.notes().at(-1) ?? ""), "final answer praise after a fixed mistake");
  h.done();
}

// ---- push-to-talk: words from the last press survive pressing again before his turn ends ----
// (36 of 46 empty "kid" turns in the logs were a press that came before the reply's turnComplete.)
{
  const h = harness();
  const heard: string[] = [];
  const off = bus.on("userUtterance", ({ text }) => heard.push(text));
  const priv = h.v as unknown as { onMessage(m: LiveServerMessage): void };
  await h.v.startTalking();
  h.v.stopTalking();
  await new Promise((r) => setTimeout(r, 300)); // release tail
  priv.onMessage({ serverContent: { inputTranscription: { text: "Master ji time kya hua hai?" } } } as LiveServerMessage);
  await h.v.startTalking(); // pressed again while he answers
  ok(heard.includes("Master ji time kya hua hai?"), "previous press's transcript reaches userUtterance when the kid presses again");
  h.v.stopTalking();
  await new Promise((r) => setTimeout(r, 300));
  // Log 18-57-48 (+298.6 s): a queued praise went out right after release and he answered it instead of
  // "graph dikha do". Now it waits for his reply to the child.
  const n = h.notes().length;
  h.verdict({ clusterId: "c5", status: "correct", text: "8x+2y=4" });
  ok(h.notes().length === n, "a verdict note waits while his reply to the child is still coming");
  h.turn("Haan, graph dekho.");
  ok(h.notes().length === n + 1, "and goes out once that reply ends");
  off();
  h.done();
}

// ---- log 2026-11-01T04-28-28-6j8t: tool-call text in his speech, and a double celebration ----
{
  const raw = "Haan toh 6/2 kitna hua? Maine board par likh diya hai, dekho.call:write_note{clusterId:c5,text:Haan beta, 6/2, lekin iska answer kitna aayega?";
  ok(spokenClean(raw) === "Haan toh 6/2 kitna hua? Maine board par likh diya hai, dekho.", `tool-call text never reaches the caption (${JSON.stringify(spokenClean(raw))})`);
  ok(spokenClean('Dekho [STEP c3 CORRECT] ye write_note("c2", "LCM") sahi hai') === "Dekho ye sahi hai", "old forms still hidden: [notes] and write_note(...)");
  ok(spokenClean("Chalo, draw_graph({lines: [y = 2x]}) dekho") === "Chalo, dekho", "any tool name with arguments is hidden");
  const h = harness();
  h.question("2x + 5 = 11");
  h.turn("Namaste beta!");
  const priv = h.v as unknown as { onMessage(m: LiveServerMessage): void; discardStale: boolean };
  priv.onMessage({ serverContent: { outputTranscription: { text: raw } } } as LiveServerMessage);
  ok(priv.discardStale && logged.some((l) => l.type === "voice.spoken_tool_text_cut"), "speaking a tool call stops the audio and drops the rest of that reply");
  h.turn();
  // 7:01: the final-answer note waited while he replied to the child; that reply already praised x = 3.
  await h.v.startTalking();
  h.verdict({ clusterId: "c6", status: "correct", text: "x=3" });
  h.v.stopTalking();
  await new Promise((r) => setTimeout(r, 300));
  const n = h.notes().length;
  h.turn("Shabash! Bilkul sahi, x = 3! Aaj ka saara homework khatam.");
  ok(h.notes().length === n && logged.some((l) => l.type === "voice.final_note_already_answered"), "a queued final-answer note he already answered is not sent as a new turn (no second celebration)");
  // ...but one he has NOT answered yet still goes out
  h.question("3/4 + 1/6");
  await h.v.startTalking();
  h.verdict({ clusterId: "c7", status: "correct", text: "11/12" });
  h.v.stopTalking();
  await new Promise((r) => setTimeout(r, 300));
  const m = h.notes().length;
  h.turn("Haan beta, likho.");
  ok(h.notes().length === m + 1 && /FINAL ANSWER CORRECT/.test(h.notes().at(-1) ?? ""), "a final-answer note he hasn't answered still goes out");
  h.done();
}

ok(logged.some((l) => l.type === "voice.answer_withheld"), "withheld writes are logged (voice.answer_withheld)");
process.exit(failed ? 1 : 0);
}
main();
