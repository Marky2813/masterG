"use client";

// Masterji's voice: a Gemini Live session (native audio) that only ever speaks
// from verdicts we send it as hidden notes. PLAN.md §5, §6.
import { GoogleGenAI, Modality, StartSensitivity, Type, type LiveServerMessage, type Session } from "@google/genai";
import { bus } from "../bus";
import type { Language, Verdict } from "../types";
import { DEFAULT_VOICE } from "./config";
import { Mic, Player } from "./audio";
import { masterjiPrompt } from "./persona";

export type VoiceStatus = "idle" | "connecting" | "live" | "error" | "closed";

export interface VoiceCallbacks {
  onStatus?: (s: VoiceStatus, detail?: string) => void;
  onCaption?: (who: "masterji" | "kid", text: string, final: boolean) => void;
}

const WRITE_NOTE = {
  name: "write_note",
  description:
    "Write a short red-pen margin note (max 12 characters) next to one step on the child's notebook, e.g. 'LCM?', 'carry 1', '9/12'.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      clusterId: { type: Type.STRING, description: "The step id from the latest note, e.g. c3" },
      text: { type: Type.STRING, description: "The note, max 12 characters" },
    },
    required: ["clusterId", "text"],
  },
};

export class MasterjiVoice {
  private session?: Session;
  private mic = new Mic();
  private player?: Player;
  private offs: (() => void)[] = [];
  private wrong = new Set<string>(); // clusters currently marked wrong, to detect FIXED
  private masterjiLine = "";
  private kidLine = "";
  language: Language;

  constructor(
    language: Language,
    private cb: VoiceCallbacks = {},
  ) {
    this.language = language;
  }

  // Must be called from a user gesture (mic permission + audio autoplay).
  async start(): Promise<void> {
    this.cb.onStatus?.("connecting");
    this.player = new Player();
    await this.player.resume();

    const res = await fetch("/api/live-token", { method: "POST" });
    const json = await res.json();
    if (!res.ok) {
      this.cb.onStatus?.("error", json.error ?? `token HTTP ${res.status}`);
      throw new Error(json.error);
    }
    const ai = new GoogleGenAI({ apiKey: json.token, httpOptions: { apiVersion: "v1alpha" } });
    this.session = await ai.live.connect({
      model: json.model,
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: DEFAULT_VOICE } } },
        systemInstruction: masterjiPrompt(this.language),
        inputAudioTranscription: {},
        outputAudioTranscription: {},
        // Lower sensitivity so his own voice from the speakers doesn't trigger a barge-in (PLAN.md §6 layer 2).
        realtimeInputConfig: { automaticActivityDetection: { startOfSpeechSensitivity: StartSensitivity.START_SENSITIVITY_LOW } },
        tools: [{ functionDeclarations: [WRITE_NOTE] }],
      },
      callbacks: {
        onopen: () => this.cb.onStatus?.("live"),
        onmessage: (m: LiveServerMessage) => this.onMessage(m),
        onerror: (e: ErrorEvent) => this.cb.onStatus?.("error", e.message),
        onclose: (e: CloseEvent) => this.cb.onStatus?.("closed", e.reason),
      },
    });

    await this.mic.start((data) => this.session?.sendRealtimeInput({ audio: { data, mimeType: "audio/pcm;rate=16000" } }));
    this.subscribe();
    this.note("[SESSION START] Greet the child and ask their name.");
  }

  stop(): void {
    this.offs.forEach((off) => off());
    this.offs = [];
    this.mic.stop();
    this.player?.close();
    this.session?.close();
    this.cb.onStatus?.("closed");
  }

  // Hidden system note to Masterji (the child never sees these).
  note(text: string): void {
    this.session?.sendRealtimeInput({ text });
  }

  private subscribe(): void {
    this.offs.push(
      bus.on("verdict", (v) => this.onVerdict(v)),
      bus.on("questionConfirmed", ({ text }) => this.note(`[QUESTION SET: ${text}]`)),
      bus.on("clusterRemoved", ({ id }) => this.wrong.delete(id)),
      bus.on("languageChanged", ({ language }) => {
        this.language = language;
        this.note(`[LANGUAGE: ${language}]`);
      }),
    );
  }

  private onVerdict(v: Verdict): void {
    if (v.status === "wrong") {
      this.wrong.add(v.clusterId);
      const parts = [
        `STEP ${v.clusterId} WRONG`,
        `child wrote: ${v.text}`,
        v.category ? `category: ${v.category}` : null,
        `rung ${v.hintRung}`,
        `repeat ${v.repeatCount}`,
        v.hint ? `hint: ${v.hint}` : null,
      ].filter(Boolean);
      this.note(`[${parts.join(" | ")}]`);
    } else if (v.status === "correct" && this.wrong.delete(v.clusterId)) {
      this.note(`[STEP ${v.clusterId} FIXED | now reads: ${v.text}]`);
    }
  }

  private onMessage(m: LiveServerMessage): void {
    const sc = m.serverContent;
    if (sc?.interrupted) {
      // The kid started talking: stop mid-word, freeze his caption with a dash.
      this.player?.flush();
      if (this.masterjiLine) this.cb.onCaption?.("masterji", this.masterjiLine + " —", true);
      this.masterjiLine = "";
    }
    for (const part of sc?.modelTurn?.parts ?? []) {
      if (part.inlineData?.data && part.inlineData.mimeType?.startsWith("audio/")) this.player?.enqueue(part.inlineData.data);
    }
    if (sc?.outputTranscription?.text) {
      this.masterjiLine += sc.outputTranscription.text;
      this.cb.onCaption?.("masterji", this.masterjiLine, false);
    }
    if (sc?.inputTranscription?.text) {
      this.kidLine += sc.inputTranscription.text;
      this.cb.onCaption?.("kid", this.kidLine, false);
    }
    if (sc?.turnComplete) {
      if (this.kidLine.trim()) bus.emit("userUtterance", { text: this.kidLine.trim() });
      this.masterjiLine = "";
      this.kidLine = "";
    }
    for (const fc of m.toolCall?.functionCalls ?? []) {
      if (fc.name === "write_note") {
        const { clusterId, text } = (fc.args ?? {}) as { clusterId?: string; text?: string };
        if (clusterId && text) bus.emit("writeNote", { clusterId, text: text.slice(0, 16) });
        this.session?.sendToolResponse({ functionResponses: { id: fc.id, name: fc.name, response: { ok: true } } });
      }
    }
  }
}
