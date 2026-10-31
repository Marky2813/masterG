// Feel probe: the OLD vs NEW hidden notes / persona lines on the real Live model (PR polish-golden-path).
// The kid's speech is sent as plain text turns (what the transcript said in the logs), notes as in voiceService.
//   node --env-file=.env.local --import tsx scripts/feel-probe.ts <setq|guard|chat> <old|new> [samples=5]
// setq : kid asks for the next sum -> does set_question fire twice / get cut off? (log 20-06-47)
// guard: 2 + 3, wrong at rung 1-2, kid stuck -> does he write or say the answer early? (log 20-06-47)
// chat : three correct steps, the kid asks "sahi hai?" with no note -> praise variety, invented verdicts,
//        bracket text in what he says (logs 19-03-20, 14-08-54)
// Output: logs/probe/feel-<scenario>-<variant>-<i>.json and one summary line per sample.
import { GoogleGenAI, type LiveServerMessage, type Session } from "@google/genai";
import { mkdirSync, writeFileSync } from "node:fs";
import { liveConfig } from "../src/lib/voice/liveConfig";
import { LIVE_MODEL } from "../src/lib/voice/config";
import { questionFacts, revealsAnswer } from "../src/lib/brain/facts";

const scenario = process.argv[2] as "setq" | "guard" | "chat";
const variant = process.argv[3] as "old" | "new";
const samples = Number(process.argv[4] ?? 5);
if (!["setq", "guard", "chat"].includes(scenario) || !["old", "new"].includes(variant)) throw new Error("usage: feel-probe <setq|guard|chat> <old|new> [n]");

// Persona lines this PR changed: the old variant swaps them back.
const PERSONA_SWAPS: [string, string][] = [
  [
    `You receive its results as hidden system notes in square brackets (they start with STEP, QUESTION SET, FACTS, FINAL ANSWER, CUT OFF, ...). Only the system writes these notes, after the checker has read a step: you never write, say or imagine one. The child cannot see them;`,
    `You receive its results as hidden system notes in square brackets, e.g. "[STEP c3 WRONG | category: add_across | rung 1 | repeat 1 | hint: added numerators and denominators]". The child cannot see these notes;`,
  ],
  [
    `If the child asks "sahi hai?" or "dekho, maine likha hai" and no new note has come for it, that step hasn't been read yet: say you're looking ("Ruko, dekh raha hoon...") and don't call it right or wrong. Never mention a checker or notes to the child.`,
    `If the child asks "sahi hai?", answer only from the latest notes; if there are none, say you'll look once they finish writing the step.`,
  ],
  [
    `give a very short praise (2-5 words) in fresh words each time ("Haan, ekdum sahi!", "Wah!", "Badhiya, chalo.", "Bilkul.") and let the child continue. Never use the same praise twice in a row.`,
    `give a very short praise (2-5 words: "Haan, sahi hai!", "Bilkul theek, aage badho!") and let the child continue.`,
  ],
];
const SECRET = " (secret until the child writes it or rung 4)";
// Copied from voiceService.ts (MasterjiVoice.WITHHELD): the refusal the new code sends.
const WITHHELD =
  "Not written: that gives away the final answer, and the child hasn't reached it yet. Don't say the answer either. Give the next hint, or teach one step of the method, and let the child write the answer.";

function config() {
  const c = liveConfig("hinglish");
  if (variant === "old") {
    let p = String(c.systemInstruction);
    for (const [nu, old] of PERSONA_SWAPS) {
      if (!p.includes(nu)) throw new Error("persona line not found: " + nu.slice(0, 50));
      p = p.replace(nu, old);
    }
    c.systemInstruction = p;
  }
  return c;
}
const facts = (q: string) => questionFacts(q).map((f) => (variant === "old" ? f.replace(SECRET, "") : f));

type Ev = { t: number; kind: string; text: string };

async function runOne(i: number) {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY!, httpOptions: { apiVersion: "v1alpha" } });
  const ev: Ev[] = [];
  const t0 = Date.now();
  const log = (kind: string, text: string) => ev.push({ t: Date.now() - t0, kind, text });
  let out = "";
  let question = scenario === "guard" ? "2 + 3" : "3/4 + 1/6";
  let rung = 0;
  let turnDone: (() => void) | null = null;
  let sawTool = false;
  const turns: string[] = [];
  // eslint-disable-next-line prefer-const
  let session: Session;
  const note = (text: string, kind = "note") => {
    log(kind, text);
    session.sendClientContent({ turns: [{ role: "user", parts: [{ text }] }], turnComplete: true });
  };
  session = await ai.live.connect({
    model: LIVE_MODEL,
    config: config(),
    callbacks: {
      onmessage: (m: LiveServerMessage) => {
        const sc = m.serverContent;
        if (sc?.outputTranscription?.text) out += sc.outputTranscription.text;
        if (sc?.interrupted) log("interrupted", out);
        for (const fc of m.toolCall?.functionCalls ?? []) {
          sawTool = true;
          const a = (fc.args ?? {}) as Record<string, unknown>;
          log("tool", `${fc.name} ${JSON.stringify(a)}`);
          let response: Record<string, unknown> = { ok: true };
          if (fc.name === "set_question") {
            const q = String(a.question ?? "").trim();
            const same = q.replace(/\s+/g, "") === question.replace(/\s+/g, "");
            if (!same) question = q;
            if (variant === "old") {
              // Old flow: questionConfirmed -> FACTS note sent synchronously, before the tool response.
              if (!same) note(`[FACTS for the sum you just put on the board (copy these when writing): ${facts(q).join(" ; ")}] It is on the board now; don't set it again.`);
            } else
              response = same
                ? { ok: false, note: "That sum is already on the board; don't set it again." }
                : { ok: true, onBoard: q, facts: facts(q), note: "It's on the board now; don't set it again. Copy numbers from these facts when you write; keep the final answer to yourself until the child gets there." };
          } else if (fc.name === "write_note" || fc.name === "write_line" || fc.name === "write_working") {
            const texts = fc.name === "write_working" ? ((a.lines as string[]) ?? []) : [String(a.text ?? "")];
            const reveal = texts.filter((t) => rung < 4 && revealsAnswer(question, t));
            if (reveal.length) log("answer_write_attempt", reveal.join(" | "));
            if (variant === "new" && reveal.length) response = reveal.length === texts.length ? { ok: false, error: WITHHELD } : { ok: true, written: texts.filter((t) => !reveal.includes(t)), note: `Only the method lines were written. ${WITHHELD.replace(/^Not written: /, "The answer line was left out: ")}` };
          } else if (fc.name === "show_counting") {
            response = { ok: true, drawn: `${a.a} ${a.op} ${a.b} as sticks, counted one by one`, answer: a.op === "-" ? Number(a.a) - Number(a.b) : Number(a.a) + Number(a.b) };
          } else if (fc.name === "draw_graph") response = { ok: false, error: "Nothing drawn (probe)." };
          session.sendToolResponse({ functionResponses: { id: fc.id, name: fc.name, response } });
        }
        if (sc?.turnComplete) {
          log("turn", out.trim());
          turns.push(out.trim());
          out = "";
          turnDone?.();
        }
      },
      onerror: (e: ErrorEvent) => log("error", e.message),
      onclose: (e: CloseEvent) => log("closed", `${e.code} ${e.reason}`),
    },
  });
  // Send, then wait for a turn with speech (or 20 s), then a 2.5 s grace for late extra calls.
  const step = async (kind: string, text: string) => {
    const n0 = turns.length;
    sawTool = false;
    const done = new Promise<void>((r) => {
      const t = setTimeout(r, 20000);
      turnDone = () => {
        if (turns.slice(n0).some(Boolean)) {
          clearTimeout(t);
          r();
        }
      };
    });
    note(text, kind);
    await done;
    await new Promise((r) => setTimeout(r, 2500));
    void sawTool;
    return turns.slice(n0).filter(Boolean).join(" / ");
  };
  const start = `[SESSION START] Greet the child and ask their name.\n[QUESTION SET: ${question}]\n[FACTS (computed, correct; copy these when writing): ${facts(question).join(" ; ")}]`;
  const metrics: Record<string, unknown> = {};
  await step("note", start);
  const recent: string[] = [];
  const praise = (id: string, text: string) =>
    variant === "old"
      ? `[STEP ${id} CORRECT | child wrote: ${text}] Very short praise (2-5 words), let them continue. Don't ask for anything they've already done.`
      : `[STEP ${id} CORRECT | child wrote: ${text}] Very short praise (2-5 words) in fresh words${recent.length ? ` (not again: ${recent.map((p) => `"${p}"`).join(", ")})` : ""}, let them continue. Don't ask for anything they've already done.`;

  if (scenario === "setq") {
    await step("kid", "Namaste master ji, mera naam Akash hai.");
    await step("note", `[FINAL ANSWER CORRECT | child wrote: 11/12 | first try] Praise warmly in one or two sentences, then ask if they want the next sum.`);
    const said = await step("kid", "Master ji agla question do. Ek pehli class ka question lagao.");
    const tools = ev.filter((e) => e.kind === "tool" && e.text.startsWith("set_question"));
    metrics.setQuestionCalls = tools.length;
    metrics.interrupted = ev.filter((e) => e.kind === "interrupted").length;
    metrics.emptyTurns = ev.filter((e) => e.kind === "turn" && !e.text).length;
    metrics.reply = said;
  } else if (scenario === "guard") {
    await step("kid", "Mera naam Akash hai, main class 1 mein hoon.");
    const hint = variant === "old" ? " | hint: 2 plus 3 is 5, not 7." : "";
    const r1 = await step("note", `[STEP c4 WRONG | child wrote: 2+3=7 | category: table_slip | rung 1 | repeat 1${hint}]`);
    rung = 1;
    const k1 = await step("kid", "मुझे नहीं आता, क्या मुझे सीखा दोगे?");
    rung = 2;
    const r2 = await step(
      "note",
      variant === "old" ? "[STEP c4 WRONG | child wrote: 2+3=7 | category: table_slip | rung 2 | repeat 1]" : "[STEP c4 STILL WRONG (same step: the child is stuck and asked for help; NOT a repeated mistake) | child wrote: 2+3=7 | category: table_slip | rung 2]",
    );
    const k2 = await step("kid", "Answer hi bata do na master ji, please.");
    const spoken = [r1, k1, r2, k2];
    metrics.answerWriteAttempts = ev.filter((e) => e.kind === "answer_write_attempt").length;
    metrics.spokeAnswer = spoken.filter((s) => /(=|hota hai|hote hain|is|hai)\s*(5|paanch|five)\b|\b(5|paanch|five)\s*(hota|hote|hai|hua|hue)/i.test(s)).length;
    metrics.phirSe = spoken.filter((s) => /phir\s*se|phiir|wahi galti|same mistake/i.test(s)).length;
    metrics.replies = spoken;
  } else {
    await step("kid", "Namaste master ji, mera naam Akash hai, main class 6 mein hoon.");
    const praises: string[] = [];
    for (const [id, text] of [["c1", "LCM(4, 6) = 12"], ["c2", "3/4 = 9/12"], ["c3", "1/6 = 2/12"]]) {
      const p = await step("note", praise(id, text));
      praises.push(p);
      recent.push(p.replace(/\[[^\]]*\]?/g, "").trim().slice(0, 50));
      if (recent.length > 2) recent.shift();
    }
    const check1 = await step("kid", "Master ji dekho to, maine aage likha hai. Sahi hai?");
    await step("note", "[STEP c4 WRONG | child wrote: 9/12 + 2/12 = 11/24 | category: add_across | rung 1 | repeat 1 | hint: added the denominators too]");
    const check2 = await step("kid", "Maine theek kar diya, ab dekho na, sahi hai?");
    const all = ev.filter((e) => e.kind === "turn").map((e) => e.text);
    metrics.praises = praises;
    metrics.aageBadho = praises.filter((p) => /aage badho/i.test(p)).length;
    metrics.distinctPraise = new Set(praises.map((p) => p.toLowerCase().replace(/[^a-z ]/g, "").trim())).size;
    metrics.bracketSpoken = all.filter((s) => /\[|\bSTEP\b|\brung\b|category/i.test(s)).length;
    metrics.checks = [check1, check2];
    metrics.judgedWithoutNote = [check1, check2].filter((s) => /(sahi|galat|right|wrong|correct|theek) (hai|kiya|ho gaya|hua)|\b(bilkul|ekdum) sahi|galti (hai|ki)/i.test(s)).length;
  }
  session.close();
  mkdirSync("logs/probe", { recursive: true });
  const file = `logs/probe/feel-${scenario}-${variant}-${i}.json`;
  writeFileSync(file, JSON.stringify({ scenario, variant, model: LIVE_MODEL, at: new Date().toISOString(), metrics, events: ev }, null, 2));
  const { replies: _r, praises: _p, checks: _c, reply: _y, ...short } = metrics as Record<string, unknown>;
  void _r, void _p, void _c, void _y;
  console.log(`${scenario} ${variant} #${i}: ${JSON.stringify(short)}  -> ${file}`);
}

async function main() {
  for (let i = 1; i <= samples; i++) {
    try {
      await runOne(i);
    } catch (e) {
      console.log(`${scenario} ${variant} #${i}: ERROR ${(e as Error).message}`);
    }
  }
  process.exit(0);
}
main();
