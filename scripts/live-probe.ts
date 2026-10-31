// Live API probe without a mic: does Masterji answer a text note, and how fast?
// node --env-file=.env.local --import tsx scripts/live-probe.ts [model] [realtime|client]
import { GoogleGenAI, Modality, type LiveServerMessage } from "@google/genai";
import { masterjiPrompt } from "../src/lib/voice/persona";

async function main() {
  const model = process.argv[2] || "gemini-2.5-flash-native-audio-preview-09-2025";
  const mode = process.argv[3] || "realtime";
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
  let out = "", audioBytes = 0, first = 0;
  const t0 = performance.now();
  let done!: () => void;
  const finished = new Promise<void>((r) => (done = r));
  const session = await ai.live.connect({
    model,
    config: {
      responseModalities: [Modality.AUDIO],
      systemInstruction: masterjiPrompt("hinglish"),
      outputAudioTranscription: {},
      speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: "Charon" } } },
    },
    callbacks: {
      onmessage: (m: LiveServerMessage) => {
        const sc = m.serverContent;
        for (const p of sc?.modelTurn?.parts ?? []) if (p.inlineData?.data) { audioBytes += p.inlineData.data.length * 0.75; first ||= performance.now() - t0; }
        if (sc?.outputTranscription?.text) out += sc.outputTranscription.text;
        if (sc?.turnComplete) done();
      },
      onerror: (e: ErrorEvent) => { console.log("error", e.message); done(); },
      onclose: (e: CloseEvent) => { console.log("closed", e.code, e.reason); done(); },
    },
  });
  const note = "[SESSION START] Greet the child and ask their name.";
  if (mode === "client") session.sendClientContent({ turns: [{ role: "user", parts: [{ text: note }] }], turnComplete: true });
  else session.sendRealtimeInput({ text: note });
  await Promise.race([finished, new Promise((r) => setTimeout(r, 25000))]);
  console.log(`${model} [${mode}] first audio ${Math.round(first)} ms, ${Math.round(audioBytes / 48000 * 10) / 10} s of audio\n  "${out.trim()}"`);
  session.close();
}
main();
