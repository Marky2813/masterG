"use client";

// Masterji's voice: a Gemini Live session (native audio) that only ever speaks
// from verdicts we send it as hidden notes. PLAN.md §5, §6.
//
// Echo: on laptop speakers the model hears itself and answers its own words
// ("I just asked you that"). So the mic is half-duplex: nothing is sent while
// Masterji is audible (+600 ms tail). The kid interrupts with the spacebar or
// the Ruko button, which stops him instantly and opens the mic.
import { GoogleGenAI, type LiveServerMessage, type Session } from "@google/genai";
import { bus } from "../bus";
import type { Language, Verdict } from "../types";
import { clientLog, getSessionId } from "../log/client";
import { Mic, Player } from "./audio";
import { liveConfig } from "./liveConfig";

export type VoiceStatus = "idle" | "connecting" | "live" | "error" | "closed";

export interface VoiceCallbacks {
  onStatus?: (s: VoiceStatus, detail?: string) => void;
  onCaption?: (who: "masterji" | "kid", text: string, final: boolean) => void;
  onSpeaking?: (speaking: boolean) => void;
}

export class MasterjiVoice {
  private session?: Session;
  private mic = new Mic();
  private player?: Player;
  private offs: (() => void)[] = [];
  private wrong = new Set<string>(); // clusters currently marked wrong, to detect FIXED
  private masterjiLine = "";
  private kidLine = "";
  private speakingTimer?: ReturnType<typeof setInterval>;
  private wasAudible = false;
  private pending: string[] = []; // notes held until Masterji finishes his sentence
  language: Language;

  constructor(
    language: Language,
    private cb: VoiceCallbacks = {},
  ) {
    this.language = language;
  }

  // Must be called from a user gesture (mic permission + audio autoplay).
  async start(): Promise<void> {
    this.status("connecting");
    this.player = new Player();
    await this.player.resume();

    const res = await fetch("/api/live-token", {
      method: "POST",
      headers: { "content-type": "application/json", "x-session-id": getSessionId() },
      body: JSON.stringify({ language: this.language }),
    });
    const json = await res.json();
    if (!res.ok) {
      this.status("error", json.error ?? `token HTTP ${res.status}`);
      throw new Error(json.error);
    }
    const ai = new GoogleGenAI({ apiKey: json.token, httpOptions: { apiVersion: "v1alpha" } });
    this.session = await ai.live.connect({
      model: json.model,
      config: liveConfig(this.language),
      callbacks: {
        onopen: () => this.status("live"),
        onmessage: (m: LiveServerMessage) => this.onMessage(m),
        onerror: (e: ErrorEvent) => this.status("error", e.message),
        onclose: (e: CloseEvent) => this.status("closed", `${e.code} ${e.reason}`),
      },
    });

    await this.mic.start((data) => {
      // Half-duplex: drop mic audio while Masterji is audible, so he never hears himself.
      if (this.player?.isAudible()) return;
      this.session?.sendRealtimeInput({ audio: { data, mimeType: "audio/pcm;rate=16000" } });
    });
    this.speakingTimer = setInterval(() => {
      this.flushNotes();
      const audible = !!this.player?.isAudible();
      if (audible !== this.wasAudible) {
        this.wasAudible = audible;
        this.cb.onSpeaking?.(audible);
      }
    }, 100);
    this.subscribe();
    this.note("[SESSION START] Greet the child and ask their name.");
  }

  stop(): void {
    this.offs.forEach((off) => off());
    this.offs = [];
    clearInterval(this.speakingTimer);
    this.mic.stop();
    this.player?.close();
    this.session?.close();
    this.status("closed");
  }

  // The kid wants to talk: stop Masterji mid-word and open the mic now.
  interrupt(): void {
    if (!this.player?.speaking) return;
    this.player.flush();
    if (this.masterjiLine) this.cb.onCaption?.("masterji", this.masterjiLine + " —", true);
    clientLog("voice.interrupt", { by: "kid", masterjiSaid: this.masterjiLine });
    this.masterjiLine = "";
  }

  // Hidden system note to Masterji (the child never sees these). A note sent mid-sentence
  // cuts him off, so notes wait until he's quiet (checked every 100 ms by the speaking timer).
  note(text: string): void {
    if (this.player?.isAudible(300)) {
      clientLog("voice.note_queued", { text });
      this.pending.push(text);
      return;
    }
    clientLog("voice.note", { text });
    this.session?.sendRealtimeInput({ text });
  }

  private flushNotes(): void {
    if (this.pending.length === 0 || this.player?.isAudible(300)) return;
    const text = this.pending.join("\n");
    this.pending = [];
    clientLog("voice.note", { text, queued: true });
    this.session?.sendRealtimeInput({ text });
  }

  private status(s: VoiceStatus, detail?: string): void {
    clientLog("voice.status", { status: s, detail });
    this.cb.onStatus?.(s, detail);
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
      this.player?.flush();
      clientLog("voice.interrupted_by_server", { masterjiSaid: this.masterjiLine });
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
      clientLog("voice.turn", { masterji: this.masterjiLine.trim(), kid: this.kidLine.trim() });
      if (this.kidLine.trim()) bus.emit("userUtterance", { text: this.kidLine.trim() });
      this.masterjiLine = "";
      this.kidLine = "";
    }
    for (const fc of m.toolCall?.functionCalls ?? []) {
      if (fc.name === "write_note") {
        const { clusterId, text } = (fc.args ?? {}) as { clusterId?: string; text?: string };
        clientLog("voice.write_note", { clusterId, text });
        if (clusterId && text) bus.emit("writeNote", { clusterId, text: text.slice(0, 16) });
        this.session?.sendToolResponse({ functionResponses: { id: fc.id, name: fc.name, response: { ok: true } } });
      }
    }
  }
}
