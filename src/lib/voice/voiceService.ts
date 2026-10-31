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
import { questionFacts, reachesFinalAnswer } from "../brain/facts";
import { sessionState } from "../sessionState";
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
  private generating = false; // server is mid-reply (audio arrived, no turnComplete yet)
  private discardStale = false; // kid interrupted: drop the old reply's leftover audio until the server ends it
  private waitingSince = 0;
  private written = new Set<string>();
  private everWrong = false; // board writes already made (dedupe repeated tool calls) // when we last asked for a reply (note sent / button released), for latency logs
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
    // One message: a second note right after would cut off his greeting.
    const q = sessionState.question; // set before Masterji started?
    this.note(`[SESSION START] Greet the child and ask their name.${q ? `\n${this.questionNote(q.text)}` : ""}`);
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
    if (this.generating) this.discardStale = true; // the server will keep streaming the old reply for a moment
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
      bus.on("questionConfirmed", ({ text }) => this.noteQuestion(text)),
      bus.on("clusterRemoved", ({ id }) => this.wrong.delete(id)),
      bus.on("languageChanged", ({ language }) => {
        this.language = language;
        this.note(`[LANGUAGE: ${language}]`);
      }),
    );
  }

  // Safety net: sometimes the model SAYS a tool call ('write_note("c1", "LCM(4, 6) = 12")') instead
  // of making it, so nothing gets written. Execute any complete spoken call once.
  private runSpokenTools(said: string): void {
    const re = /write_(note|line)\s*\(\s*(?:["']?(c\d+)["']?\s*,\s*)?["']([^"']{1,44})["']\s*\)/gi;
    for (const m of said.matchAll(re)) {
      const [, kind, clusterId, text] = m;
      const key = `spoken|${kind}|${clusterId ?? ""}|${text}`;
      if (this.written.has(key)) continue;
      this.written.add(key);
      clientLog("voice.spoken_tool_executed", { kind, clusterId, text });
      if (kind.toLowerCase() === "note" && clusterId) bus.emit("writeNote", { clusterId, text: text.slice(0, 28) });
      else bus.emit("writeLine", { text: text.slice(0, 44) });
    }
  }

  private questionNote(text: string): string {
    const facts = questionFacts(text);
    return `[QUESTION SET: ${text}]${facts.length ? `\n[FACTS (computed, correct; copy these when writing): ${facts.join(" ; ")}]` : ""}`;
  }

  private noteQuestion(text: string): void {
    this.note(this.questionNote(text));
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
        v.hintRung >= 4 ? "ACTION (silent): write the correct step from FACTS with the line tool, then ask the child to do the next line" : null,
        v.hintRung === 3 ? "ACTION (silent): note the one fact they need (from FACTS) with the note tool" : null,
      ].filter(Boolean);
      this.note(`[${parts.join(" | ")}]`);
    } else if (v.status === "correct") {
      const q = sessionState.question?.text;
      const final = !!q && reachesFinalAnswer(q, v.text);
      const fixed = this.wrong.delete(v.clusterId);
      const hadMistake = this.wrong.size > 0 || fixed || this.everWrong;
      if (final) {
        this.wrong.clear();
        this.note(`[FINAL ANSWER CORRECT | child wrote: ${v.text} | ${hadMistake ? "after fixing a mistake: praise the effort" : "first try"}] Praise warmly in one or two sentences, then ask if they want the next sum.`);
      } else if (fixed || this.wrong.size > 0) {
        // Corrected on the same line, or a right step on a new line after a mistake.
        this.note(`[STEP ${v.clusterId} CORRECT NOW | child wrote: ${v.text}] Short praise, then let them continue.`);
        this.wrong.clear();
      }
    }
    if (v.status === "wrong") this.everWrong = true;
  }

  private onMessage(m: LiveServerMessage): void {
    const sc = m.serverContent;
    if (sc?.interrupted) {
      this.discardStale = false;
      this.generating = false;
      this.player?.flush();
      clientLog("voice.interrupted_by_server", { masterjiSaid: this.masterjiLine });
      if (this.masterjiLine) this.cb.onCaption?.("masterji", this.masterjiLine + " —", true);
      this.masterjiLine = "";
    }
    for (const part of sc?.modelTurn?.parts ?? []) {
      if (part.inlineData?.data && part.inlineData.mimeType?.startsWith("audio/")) {
        if (this.discardStale) continue;
        this.generating = true;
        if (this.waitingSince) {
          clientLog("voice.first_audio", { ms: Math.round(performance.now() - this.waitingSince) });
          this.waitingSince = 0;
        }
        this.player?.enqueue(part.inlineData.data);
      }
    }
    if (sc?.outputTranscription?.text && !this.discardStale) {
      this.masterjiLine += sc.outputTranscription.text;
      // The model sometimes echoes a hidden note ("[STEP c3 ...]"): never show it to the child.
      this.runSpokenTools(this.masterjiLine);
      const shown = this.masterjiLine
        .replace(/\[[^\]]*\]?/g, "")
        .replace(/write_(note|line)\s*\([^)]*\)?/gi, "")
        .replace(/\s+/g, " ")
        .trim();
      if (/\[|write_(note|line)/i.test(this.masterjiLine)) clientLog("voice.echoed_text_hidden", { raw: this.masterjiLine });
      this.cb.onCaption?.("masterji", shown, false);
    }
    if (sc?.inputTranscription?.text) {
      this.kidLine += sc.inputTranscription.text;
      this.cb.onCaption?.("kid", this.kidLine, false);
    }
    if (sc?.turnComplete) {
      const wasStale = this.discardStale;
      this.discardStale = false;
      this.generating = false;
      clientLog("voice.turn", { masterji: this.masterjiLine.trim(), kid: this.kidLine.trim(), underruns: this.player?.takeUnderruns() ?? 0, staleDropped: wasStale });
      this.player?.endTurn();
      if (this.kidLine.trim()) bus.emit("userUtterance", { text: this.kidLine.trim() });
      this.masterjiLine = "";
      this.kidLine = "";
    }
    for (const fc of m.toolCall?.functionCalls ?? []) {
      const args = (fc.args ?? {}) as { clusterId?: string; text?: string };
      const text = args.text?.trim();
      const key = `${fc.name}|${args.clusterId ?? ""}|${text}`;
      const duplicate = this.written.has(key);
      if (text && !duplicate) this.written.add(key);
      if (fc.name === "write_note") {
        clientLog("voice.write_note", { clusterId: args.clusterId, text, duplicate });
        if (args.clusterId && text && !duplicate) bus.emit("writeNote", { clusterId: args.clusterId, text: text.slice(0, 28) });
      } else if (fc.name === "write_line") {
        clientLog("voice.write_line", { text, duplicate });
        if (text && !duplicate) bus.emit("writeLine", { text: text.slice(0, 44) });
      }
      this.session?.sendToolResponse({
        functionResponses: { id: fc.id, name: fc.name, response: { ok: !duplicate, ...(duplicate ? { note: "already written; don't repeat" } : {}) } },
      });
    }
  }
}
