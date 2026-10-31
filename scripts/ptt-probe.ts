// Push-to-talk probe: speak a real 16 kHz clip into a Live session (manual activity start/end)
// and measure release -> first audio, plus what was transcribed.
// node --env-file=.env.local --import tsx scripts/ptt-probe.ts <locked|unlocked|direct> [model] [pcmFile]
import { GoogleGenAI, type LiveConnectConfig, type LiveServerMessage } from "@google/genai";
import { readFileSync } from "node:fs";
import { liveConfig } from "../src/lib/voice/liveConfig";
import { LIVE_MODEL } from "../src/lib/voice/config";

async function main() {
  const mode = process.argv[2] ?? "locked";
  const MODEL = process.argv[3] ?? LIVE_MODEL;
  const pcm = readFileSync(process.argv[4] ?? "logs/probe/speech16k.pcm");
  const config: LiveConnectConfig = { ...liveConfig("hinglish"), realtimeInputConfig: { automaticActivityDetection: { disabled: true } } };
  let apiKey = process.env.GEMINI_API_KEY!;
  if (mode !== "direct") {
    const server = new GoogleGenAI({ apiKey, httpOptions: { apiVersion: "v1alpha" } });
    const now = Date.now();
    const tok = await server.authTokens.create({ config: { uses: 1, expireTime: new Date(now + 600000).toISOString(), newSessionExpireTime: new Date(now + 120000).toISOString(),
      liveConnectConstraints: mode === "locked" ? { model: MODEL, config } : { model: MODEL }, httpOptions: { apiVersion: "v1alpha" } } });
    apiKey = tok.name!;
  }
  const ai = new GoogleGenAI({ apiKey, httpOptions: { apiVersion: "v1alpha" } });
  const t0 = performance.now();
  const ev: string[] = [];
  let released = 0, firstAudio = 0, kid = "", out = "", noteAt = 0, noteAudio = 0;
  const noteLat: number[] = [];
  let turnDone!: () => void; let turns = 0; const wait = () => new Promise<void>((r) => (turnDone = r));
  const session = await ai.live.connect({ model: MODEL, config, callbacks: {
    onmessage: (m: LiveServerMessage) => {
      const sc = m.serverContent;
      if (sc?.inputTranscription?.text) kid += sc.inputTranscription.text;
      if (sc?.outputTranscription?.text) out += sc.outputTranscription.text;
      const hasAudio = sc?.modelTurn?.parts?.some((p) => p.inlineData);
      if (hasAudio && released && !firstAudio) firstAudio = performance.now();
      if (hasAudio && noteAt && !noteAudio) { noteAudio = performance.now(); noteLat.push(Math.round(noteAudio - noteAt)); noteAt = 0; }
      if (sc?.turnComplete) { turns++; ev.push(`turn ${turns} at ${Math.round(performance.now() - t0)} ms: "${out.trim()}"`); out = ""; turnDone?.(); }
    },
    onerror: (e: ErrorEvent) => ev.push("error " + e.message),
    onclose: (e: CloseEvent) => { ev.push(`closed ${e.code} ${e.reason}`); turnDone?.(); },
  } });
  // 1) greeting from a text note
  let w = wait(); noteAt = performance.now(); session.sendClientContent({ turns: [{ role: "user", parts: [{ text: "[SESSION START] Greet the child and ask their name." }] }], turnComplete: true }); await Promise.race([w, new Promise((r) => setTimeout(r, 15000))]);
  // 2) the kid holds the button and speaks (real-time pacing, 100 ms chunks), then releases
  w = wait();
  noteAt = 0; session.sendRealtimeInput({ activityStart: {} });
  for (let i = 0; i < pcm.length; i += 3200) {
    session.sendRealtimeInput({ audio: { data: pcm.subarray(i, i + 3200).toString("base64"), mimeType: "audio/pcm;rate=16000" } });
    await new Promise((r) => setTimeout(r, 100));
  }
  session.sendRealtimeInput({ activityEnd: {} });
  released = performance.now();
  await Promise.race([w, new Promise((r) => setTimeout(r, 15000))]);
  // 3) a hidden note after the kid spoke (this is where 1007 hit in the app)
  w = wait(); noteAt = performance.now(); noteAudio = 0; session.sendClientContent({ turns: [{ role: "user", parts: [{ text: "[STEP c1 WRONG | child wrote: 3/4 + 1/6 = 4/10 | category: add_across | rung 1 | repeat 1]" }] }], turnComplete: true }); await Promise.race([w, new Promise((r) => setTimeout(r, 15000))]);
  session.close();
  console.log(`[${mode} ${MODEL}] note -> audio: ${JSON.stringify(noteLat)} ms | heard kid: "${kid.trim()}" | release -> first audio: ${firstAudio ? Math.round(firstAudio - released) + " ms" : "none"}`);
  for (const e of ev) console.log("  " + e);
}
main();
