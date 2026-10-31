// Interrupt probe: Masterji is mid-explanation, the kid cuts in (push-to-talk). Does a
// "[CUT OFF: they heard only ...]" context note (turnComplete false) before activityStart keep him
// on track, and does the Live API accept it mid-session without a 1007?
// node --env-file=.env.local --import tsx scripts/interrupt-probe.ts <cutnote|none|realtime>
import { GoogleGenAI, type LiveServerMessage } from "@google/genai";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { liveConfig } from "../src/lib/voice/liveConfig";
import { LIVE_MODEL } from "../src/lib/voice/config";

async function main() {
  const mode = process.argv[2] ?? "cutnote";
  const pcm = readFileSync("logs/probe/speech16k.pcm");
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY!, httpOptions: { apiVersion: "v1alpha" } });
  const ev: string[] = [];
  let out = "", kid = "", audioS = 0;
  const written: string[] = [];
  let turnDone: () => void = () => {};
  const wait = (ms = 15000) => Promise.race([new Promise<void>((r) => (turnDone = r)), new Promise<void>((r) => setTimeout(r, ms))]);
  const session = await ai.live.connect({
    model: LIVE_MODEL,
    config: liveConfig("hinglish"),
    callbacks: {
      onmessage: (m: LiveServerMessage) => {
        const sc = m.serverContent;
        for (const p of sc?.modelTurn?.parts ?? []) if (p.inlineData?.data) audioS += (p.inlineData.data.length * 0.75) / 2 / 24000;
        if (sc?.outputTranscription?.text) out += sc.outputTranscription.text;
        if (sc?.inputTranscription?.text) kid += sc.inputTranscription.text;
        if (sc?.interrupted) ev.push(`interrupted (said so far: "${out.trim()}")`);
        for (const fc of m.toolCall?.functionCalls ?? []) {
          ev.push(`tool ${fc.name} ${JSON.stringify(fc.args)}`);
          written.push(String((fc.args as { title?: string })?.title ?? fc.name));
          session.sendToolResponse({ functionResponses: { id: fc.id, name: fc.name, response: { ok: true } } });
        }
        if (sc?.turnComplete) {
          ev.push(`turn: "${out.trim()}"${kid ? ` | kid: "${kid.trim()}"` : ""}`);
          out = "";
          kid = "";
          turnDone();
        }
      },
      onerror: (e: ErrorEvent) => ev.push("error " + e.message),
      onclose: (e: CloseEvent) => {
        ev.push(`closed ${e.code} ${e.reason}`);
        turnDone();
      },
    },
  });
  const note = (text: string, turnComplete = true) => session.sendClientContent({ turns: [{ role: "user", parts: [{ text }] }], turnComplete });
  let w = wait();
  note("[SESSION START] Greet the child and ask their name and class.\n[QUESTION SET: 3/4 + 1/6]\n[FACTS: LCM(4, 6) = 12 ; 3/4 = 9/12 ; 1/6 = 2/12 ; answer 11/12]");
  await w;
  // Kid asks how; Masterji starts a long explanation.
  audioS = 0;
  out = "";
  w = wait(4000);
  note("[The child asked: 'Masterji LCM kaise nikalte hain? Poora detail mein samjhao, multiples se aur prime factors se dono.']");
  // Let ~3 s of audio arrive, then cut him off (what a kid pressing SPACE does).
  const t0 = Date.now();
  while (audioS < 3 && Date.now() - t0 < 8000) await new Promise((r) => setTimeout(r, 50));
  const soFar = out.trim();
  const heard = soFar.split(/\s+/).slice(0, Math.max(1, Math.floor(soFar.split(/\s+/).length * 0.4))).join(" ");
  ev.push(`[cut at ${audioS.toFixed(1)} s audio; transcript so far "${soFar}"; pretend heard "${heard}"]`);
  if (mode === "cutnote") note(`[CUT OFF: the child pressed talk and stopped you. They heard only: "${heard}". Already on the board, don't write again: ${written.join("; ") || "nothing"}. Answer them first, then continue from there if it still matters.]`, false);
  session.sendRealtimeInput({ activityStart: {} });
  if (mode === "realtime") session.sendRealtimeInput({ text: `[CUT OFF: they heard only: "${heard}"]` });
  for (let i = 0; i < pcm.length; i += 3200) {
    session.sendRealtimeInput({ audio: { data: pcm.subarray(i, i + 3200).toString("base64"), mimeType: "audio/pcm;rate=16000" } });
    await new Promise((r) => setTimeout(r, 100));
  }
  session.sendRealtimeInput({ activityEnd: {} });
  // Wait for his answer to the kid (the turn that carries the kid's transcript).
  const t1 = Date.now();
  while (!ev.some((e) => e.includes("| kid:")) && Date.now() - t1 < 25000) await new Promise((r) => setTimeout(r, 100));
  session.close();
  const report = `[${mode}] ${new Date().toISOString()}\n` + ev.map((e) => "  " + e).join("\n");
  console.log(report);
  mkdirSync("logs/probe", { recursive: true });
  writeFileSync(`logs/probe/interrupt-${mode}.txt`, report + "\n");
}
main();
