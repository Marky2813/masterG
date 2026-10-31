// Which prebuilt voice actually sounds male? Connects through an ephemeral token exactly like
// the app, records Masterji's greeting, estimates the median pitch (F0), saves a WAV per voice.
// node --env-file=.env.local --import tsx scripts/voice-pitch.ts [voice ...]
import { GoogleGenAI, type LiveServerMessage } from "@google/genai";
import { mkdirSync, writeFileSync } from "node:fs";
import { liveConfig } from "../src/lib/voice/liveConfig";
import { LIVE_MODEL } from "../src/lib/voice/config";

function wav(pcm: Buffer, rate: number): Buffer {
  const h = Buffer.alloc(44);
  h.write("RIFF", 0); h.writeUInt32LE(36 + pcm.length, 4); h.write("WAVE", 8); h.write("fmt ", 12);
  h.writeUInt32LE(16, 16); h.writeUInt16LE(1, 20); h.writeUInt16LE(1, 22); h.writeUInt32LE(rate, 24);
  h.writeUInt32LE(rate * 2, 28); h.writeUInt16LE(2, 32); h.writeUInt16LE(16, 34); h.write("data", 36); h.writeUInt32LE(pcm.length, 40);
  return Buffer.concat([h, pcm]);
}

// Autocorrelation F0 per 40 ms frame over voiced frames, median in Hz.
function medianF0(pcm: Buffer, rate: number): number {
  const x = new Float32Array(pcm.length / 2);
  for (let i = 0; i < x.length; i++) x[i] = pcm.readInt16LE(i * 2) / 32768;
  const frame = Math.round(rate * 0.04), f0s: number[] = [];
  const minLag = Math.floor(rate / 400), maxLag = Math.floor(rate / 60);
  for (let s = 0; s + frame + maxLag < x.length; s += frame) {
    let energy = 0;
    for (let i = 0; i < frame; i++) energy += x[s + i] ** 2;
    if (energy / frame < 1e-4) continue;
    let best = 0, bestLag = 0;
    for (let lag = minLag; lag <= maxLag; lag++) {
      let c = 0;
      for (let i = 0; i < frame; i++) c += x[s + i] * x[s + i + lag];
      if (c > best) { best = c; bestLag = lag; }
    }
    if (best / energy > 0.5) f0s.push(rate / bestLag);
  }
  f0s.sort((a, b) => a - b);
  return Math.round(f0s[Math.floor(f0s.length / 2)] ?? 0);
}

async function one(voice: string) {
  const server = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY!, httpOptions: { apiVersion: "v1alpha" } });
  const config = liveConfig("hinglish", voice);
  const now = Date.now();
  const token = await server.authTokens.create({ config: { uses: 1, expireTime: new Date(now + 600000).toISOString(), newSessionExpireTime: new Date(now + 120000).toISOString(), liveConnectConstraints: { model: LIVE_MODEL, config }, httpOptions: { apiVersion: "v1alpha" } } });
  const ai = new GoogleGenAI({ apiKey: token.name!, httpOptions: { apiVersion: "v1alpha" } });
  const chunks: Buffer[] = []; let text = "";
  let done!: () => void; const finished = new Promise<void>((r) => (done = r));
  const session = await ai.live.connect({ model: LIVE_MODEL, config, callbacks: {
    onmessage: (m: LiveServerMessage) => {
      for (const p of m.serverContent?.modelTurn?.parts ?? []) if (p.inlineData?.data) chunks.push(Buffer.from(p.inlineData.data, "base64"));
      if (m.serverContent?.outputTranscription?.text) text += m.serverContent.outputTranscription.text;
      if (m.serverContent?.turnComplete) done();
    }, onerror: () => done(), onclose: () => done() } });
  session.sendRealtimeInput({ text: "[SESSION START] Greet the child and ask their name." });
  await Promise.race([finished, new Promise((r) => setTimeout(r, 20000))]);
  session.close();
  const pcm = Buffer.concat(chunks);
  mkdirSync("logs/voices", { recursive: true });
  writeFileSync(`logs/voices/${voice}.wav`, wav(pcm, 24000));
  const f0 = medianF0(pcm, 24000);
  console.log(`${voice.padEnd(10)} F0 ${String(f0).padStart(4)} Hz  ${f0 && f0 < 160 ? "male range" : "NOT male range"}  ${(pcm.length / 48000).toFixed(1)} s  "${text.trim().slice(0, 70)}"`);
}

async function main() {
  const voices = process.argv.slice(2).length ? process.argv.slice(2) : ["Charon", "Orus", "Fenrir", "Iapetus", "Algenib", "Alnilam"];
  for (const v of voices) await one(v).catch((e) => console.log(v, "ERR", String(e.message).slice(0, 150)));
}
main();
