"use client";

// Masterji's voice: a Gemini Live session (native audio) that only ever speaks
// from verdicts we send it as hidden notes. PLAN.md §5, §6.
//
// Push-to-talk: the kid holds space (or the mic button) to talk. Mic audio is sent
// only while held, so Masterji never hears himself through the speakers. Pressing
// while he talks stops him mid-word. Hidden notes go as client-content turns
// (realtime text is ignored when voice-activity detection is off).
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
  private talking = false; // push-to-talk held
  private waitingSince = 0; // when we last asked for a reply (note sent / button released), for latency logs
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
      if (this.talking) this.session?.sendRealtimeInput({ audio: { data, mimeType: "audio/pcm;rate=16000" } });
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

  // Push-to-talk pressed: stop Masterji mid-word if he's talking, start sending the mic.
  async startTalking(): Promise<void> {
    if (this.talking || !this.session) return;
    this.talking = true;
    await this.mic.resume();
    if (this.player?.speaking) {
      this.player.flush();
      if (this.masterjiLine) this.cb.onCaption?.("masterji", this.masterjiLine + " —", true);
      clientLog("voice.interrupt", { by: "kid", masterjiSaid: this.masterjiLine });
      this.masterjiLine = "";
    }
    this.kidLine = "";
    this.cb.onCaption?.("kid", "…", false);
    this.session.sendRealtimeInput({ activityStart: {} });
    clientLog("voice.ptt_down", {});
  }

  // Push-to-talk released: Masterji answers.
  stopTalking(): void {
    if (!this.talking) return;
    this.talking = false;
    this.session?.sendRealtimeInput({ activityEnd: {} });
    this.waitingSince = performance.now();
    clientLog("voice.ptt_up", {});
  }

  // Hidden system note to Masterji (the child never sees these). A note sent mid-sentence
  // cuts him off, so notes wait until he's quiet (checked every 100 ms by the speaking timer).
  note(text: string): void {
    if (this.talking || this.player?.isAudible(300)) {
      clientLog("voice.note_queued", { text });
      this.pending.push(text);
      return;
    }
    this.sendNote(text);
  }

  private sendNote(text: string, queued = false): void {
    clientLog("voice.note", { text, queued });
    this.waitingSince = performance.now();
    this.session?.sendClientContent({ turns: [{ role: "user", parts: [{ text }] }], turnComplete: true });
  }

  private flushNotes(): void {
    if (this.pending.length === 0 || this.talking || this.player?.isAudible(300)) return;
    const text = this.pending.join("\n");
    this.pending = [];
    this.sendNote(text, true);
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
      if (part.inlineData?.data && part.inlineData.mimeType?.startsWith("audio/")) {
        if (this.waitingSince) {
          clientLog("voice.first_audio", { ms: Math.round(performance.now() - this.waitingSince) });
          this.waitingSince = 0;
        }
        this.player?.enqueue(part.inlineData.data);
      }
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
