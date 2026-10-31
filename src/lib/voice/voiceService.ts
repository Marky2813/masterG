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
import { isSimplified, methodFacts, questionFacts, reachesFinalAnswer, simplestAnswer } from "../brain/facts";
import { sessionState } from "../sessionState";
import { kindOf } from "../brain/kind";
import { clientLog, getSessionId } from "../log/client";
import { Mic, Player } from "./audio";
import { liveConfig } from "./liveConfig";
import { planGraph } from "../redpen/graph";

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
  private everWrong = false;
  private generation = 0; // which Live session is current (old ones are ignored)
  private stopping = false;
  private reconnecting = false;
  private history: string[] = []; // recent turns, handed over on reconnect
  private recentWrites: { t: number; text: string; nums: string }[] = []; // board writes, for the cut-off note and re-write guard
  private selfSet: string | null = null; // question Masterji put on the board himself (don't echo it back as "QUESTION SET") // board writes already made (dedupe repeated tool calls) // when we last asked for a reply (note sent / button released), for latency logs
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

    await this.openSession();

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

  // A fresh Live session (token + connect). Used at start and on every reconnect.
  private async openSession(): Promise<void> {
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
    const generation = ++this.generation;
    this.session = await ai.live.connect({
      model: json.model,
      config: liveConfig(this.language),
      callbacks: {
        onopen: () => this.status("live"),
        onmessage: (m: LiveServerMessage) => {
          if (generation === this.generation) this.onMessage(m);
        },
        onerror: (e: ErrorEvent) => this.status("error", e.message),
        onclose: (e: CloseEvent) => {
          if (generation !== this.generation) return; // an old session we replaced
          this.status("closed", `${e.code} ${e.reason}`);
          if (!this.stopping) void this.reconnect(`closed ${e.code}`);
        },
      },
    });
  }

  // Live sessions end after ~10 minutes (log 17-38-27: "1008 ... GoAway"). Reconnect quietly and
  // hand Masterji the lesson so far, so he carries on without greeting again.
  private async reconnect(why: string): Promise<void> {
    if (this.reconnecting || this.stopping) return;
    this.reconnecting = true;
    clientLog("voice.reconnect", { why });
    this.status("connecting", "reconnecting");
    const old = this.session;
    this.generation++; // ignore anything the old session still sends
    try {
      old?.close();
    } catch {
      /* already closed */
    }
    try {
      await this.openSession();
      const q = sessionState.question;
      const recent = this.history.slice(-8).join(" | ");
      this.sendNote(
        `[RECONNECTED: the line dropped for a moment. Continue the SAME lesson; do NOT greet or ask the name again; say at most "Haan, main yahin hoon".${recent ? ` Recent conversation: ${recent}` : ""}]${q ? `\n${this.questionNote(q.text)}` : ""}`,
      );
      clientLog("voice.reconnected", {});
    } catch (e) {
      clientLog("voice.reconnect_failed", { error: (e as Error).message });
    } finally {
      this.reconnecting = false;
    }
  }

  stop(): void {
    this.stopping = true;
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
    const wasGenerating = this.generating;
    if (this.generating) this.discardStale = true; // the server will keep streaming the old reply for a moment
    if (this.player?.speaking || wasGenerating) {
      const frac = this.player?.speaking ? this.player.flush() : 0;
      // The server thinks the child heard everything it generated; the child heard only what played.
      const words = this.masterjiLine.replace(/\[[^\]]*\]?/g, "").trim().split(/\s+/).filter(Boolean);
      const heard = words.slice(0, Math.round(words.length * frac)).join(" ");
      if (heard) this.cb.onCaption?.("masterji", heard + " —", true);
      clientLog("voice.interrupt", { by: "kid", masterjiSaid: this.masterjiLine, heardFrac: +frac.toFixed(2), heard });
      // Context only (turnComplete false): he answers after the child speaks. Probe: logs/probe/interrupt-cutnote.txt.
      const onBoard = this.recentWrites.filter((w) => performance.now() - w.t < 90_000).map((w) => w.text);
      this.session.sendClientContent({
        turns: [{ role: "user", parts: [{ text: `[CUT OFF: the child pressed talk and stopped you mid-reply. They heard only: "${heard || "(nothing yet)"}".${onBoard.length ? ` Already on the board, don't write it again: ${onBoard.slice(-6).join(" ; ")}.` : ""} Answer what they say first; then continue from where they stopped you only if it still matters.]` }] }],
        turnComplete: false,
      });
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
      bus.on("questionConfirmed", ({ text }) => {
        if (this.selfSet === text) {
          this.selfSet = null;
          const facts = questionFacts(text);
          this.note(`[FACTS for the sum you just put on the board (copy these when writing): ${facts.join(" ; ")}] It is on the board now; don't set it again.`);
        } else this.noteQuestion(text);
      }),
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

  private remember(lines: string[]): void {
    const t = performance.now();
    for (const text of lines) this.recentWrites.push({ t, text, nums: (text.match(/\d+/g) ?? []).join(",") });
    this.recentWrites = this.recentWrites.slice(-20);
  }

  // After an interrupt he tends to re-write the same working in new words ("multiples of 4: 4, 8, 12"
  // then "4 ke multiples: 4, 8, 12, 16"). Same numbers in most lines, written in the last 90 s = a repeat.
  private rewritesRecent(lines: string[]): boolean {
    const recent = this.recentWrites.filter((w) => performance.now() - w.t < 90_000 && w.nums);
    const numbered = lines.map((l) => (l.match(/\d+/g) ?? []).join(",")).filter(Boolean);
    if (!numbered.length || !recent.length) return false;
    const same = numbered.filter((n) => recent.some((w) => w.nums.startsWith(n) || n.startsWith(w.nums)));
    return same.length / numbered.length >= 0.6;
  }

  private questionNote(text: string): string {
    const facts = questionFacts(text);
    return `[QUESTION SET: ${text}]${facts.length ? `\n[FACTS (computed, correct; copy these when writing): ${facts.join(" ; ")}]` : ""}`;
  }

  private noteQuestion(text: string): void {
    this.note(this.questionNote(text));
  }

  // Messy handwriting (Flash rates every crop): mention it at most once a minute, so he doesn't nag.
  private lastHandwritingAt = -1e9;
  private handwritingPart(v: Verdict): string | null {
    if (v.handwriting !== "messy" || performance.now() - this.lastHandwritingAt < 60_000) return null;
    this.lastHandwritingAt = performance.now();
    return `HANDWRITING messy: ${v.handwritingNote || "hard to read"}`;
  }

  private onVerdict(v: Verdict): void {
    const hw = this.handwritingPart(v);
    if (hw) clientLog("voice.handwriting_flag", { clusterId: v.clusterId, note: v.handwritingNote, status: v.status });
    // Correct-step notes carry the handwriting remark inside the bracket.
    const withHw = (n: string) => (hw ? n.replace("]", ` | ${hw}]`) + " Also mention the handwriting once, kindly." : n);
    if (v.status === "unsure" && hw) {
      this.note(`[STEP ${v.clusterId} ${hw}] Kindly ask the child to write that more clearly so you can check it. Don't say whether it's right or wrong.`);
      return;
    }
    if (v.status === "wrong") {
      this.wrong.add(v.clusterId);
      const parts = [
        `STEP ${v.clusterId} WRONG`,
        `child wrote: ${v.text}`,
        v.category ? `category: ${v.category}` : null,
        `rung ${v.hintRung}`,
        `repeat ${v.repeatCount}`,
        v.hint ? `hint: ${v.hint}` : null,
        hw,
        ...methodFacts(v.text).slice(0, 6).map((m) => `METHOD ${m}`),
        v.hintRung >= 4 ? "ACTION (silent): write the correct step from FACTS with the line tool, then ask the child to do the next line" : null,
        v.hintRung === 3 ? "ACTION (silent): note the one fact they need (from FACTS) with the note tool" : null,
      ].filter(Boolean);
      this.note(`[${parts.join(" | ")}]`);
    } else if (v.status === "correct") {
      const q = sessionState.question?.text;
      const final = !!q && reachesFinalAnswer(q, v.text);
      const fixed = this.wrong.delete(v.clusterId);
      const hadMistake = this.wrong.size > 0 || fixed || this.everWrong;
      if (final && isSimplified(v.text)) {
        this.wrong.clear();
        this.note(withHw(`[FINAL ANSWER CORRECT | child wrote: ${v.text} | ${hadMistake ? "after fixing a mistake: praise the effort" : "first try"}] Praise warmly in one or two sentences, then ask if they want the next sum.`));
      } else if (final) {
        this.wrong.clear();
        this.note(withHw(`[STEP ${v.clusterId} CORRECT, NOT SIMPLIFIED YET | child wrote: ${v.text} | simplest form: ${q ? simplestAnswer(q) : "?"}] Say it's right, then ask them to simplify it (don't give the simplest form unless they're stuck).`));
      } else if (fixed || this.wrong.size > 0) {
        // Corrected on the same line, or a right step on a new line after a mistake.
        this.note(withHw(`[STEP ${v.clusterId} CORRECT NOW | child wrote: ${v.text}] Short praise, then let them continue.`));
        this.wrong.clear();
      } else {
        // Every correct step gets a short acknowledgement, so he follows the child's progress.
        this.note(withHw(`[STEP ${v.clusterId} CORRECT | child wrote: ${v.text}] Very short praise (2-5 words), let them continue. Don't ask for anything they've already done.`));
      }
    }
    if (v.status === "wrong") this.everWrong = true;
  }

  private onMessage(m: LiveServerMessage): void {
    if (m.goAway) {
      clientLog("voice.go_away", { timeLeft: m.goAway.timeLeft });
      void this.reconnect("goAway");
      return;
    }
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
      if (this.kidLine.trim()) this.history.push(`child: ${this.kidLine.trim()}`);
      if (this.masterjiLine.trim()) this.history.push(`you: ${this.masterjiLine.trim().slice(0, 160)}`);
      this.history = this.history.slice(-12);
      this.masterjiLine = "";
      this.kidLine = "";
    }
    for (const fc of m.toolCall?.functionCalls ?? []) {
      const args = (fc.args ?? {}) as { clusterId?: string; text?: string };
      const text = args.text?.trim();
      const key = `${fc.name}|${args.clusterId ?? ""}|${text}`;
      let duplicate = this.written.has(key);
      if (text && !duplicate) this.written.add(key);
      if (fc.name === "write_note") {
        clientLog("voice.write_note", { clusterId: args.clusterId, text, duplicate });
        if (args.clusterId && text && !duplicate) bus.emit("writeNote", { clusterId: args.clusterId, text: text.slice(0, 28) });
      } else if (fc.name === "draw_graph") {
        const a = (fc.args ?? {}) as { lines?: unknown; markX?: unknown };
        const lines = Array.isArray(a.lines) ? a.lines.filter((l): l is string => typeof l === "string" && l.length < 40).slice(0, 3) : [];
        const markX = typeof a.markX === "number" && Number.isFinite(a.markX) ? a.markX : undefined;
        const gkey = `graph|${lines.join("|")}|${markX}`;
        const dup = this.written.has(gkey);
        const plan = lines.length ? planGraph(lines, markX) : null;
        clientLog("voice.draw_graph", { lines, markX, duplicate: dup, plottable: !!plan, crossesAt: plan?.markX });
        if (plan && !dup) {
          this.written.add(gkey);
          bus.emit("drawGraph", { lines: lines.map((expr) => ({ expr })), markX: plan.markX });
        }
        // Tell him what is really on the board, so he never says "x = 3" for a crossing at x = 1
        // or "maine draw kiya hai" when nothing could be drawn.
        this.session?.sendToolResponse({
          functionResponses: {
            id: fc.id,
            name: fc.name,
            response: !plan
              ? { ok: false, error: "Nothing drawn: those lines could not be plotted. Use expressions in x ('3x + 5', '20') or equations ('8x + 2y = 4'). Don't say it's on the board." }
              : dup
                ? { ok: false, note: "already on the board; don't draw it again" }
                : { ok: true, drawn: plan.lines.map((l) => l.label), crossesAt: plan.markX ?? "they don't cross in view", note: "Say the crossing exactly as given here." },
          },
        });
        continue;
      } else if (fc.name === "write_working") {
        const a = (fc.args ?? {}) as { title?: unknown; lines?: unknown };
        const lines = (Array.isArray(a.lines) ? a.lines : []).filter((l): l is string => typeof l === "string" && !!l.trim()).slice(0, 6);
        const title = typeof a.title === "string" && a.title.trim() ? a.title.trim() : null;
        const wkey = `working|${lines.join("|")}`;
        const dupW = this.written.has(wkey) || this.rewritesRecent(lines);
        clientLog("voice.write_working", { title, lines, duplicate: dupW });
        duplicate = dupW;
        if (lines.length && !dupW) {
          this.written.add(wkey);
          this.remember(title ? [title, ...lines] : lines);
          for (const l of title ? [title, ...lines] : lines) bus.emit("writeLine", { text: l.trim().slice(0, 44) });
        }
      } else if (fc.name === "set_question") {
        const question = ((fc.args ?? {}) as { question?: string }).question?.trim();
        // Loop guard: a QUESTION SET note made him call set_question again and again (log 17-38-27).
        const same = !!question && question.replace(/\s+/g, "") === (sessionState.question?.text ?? "").replace(/\s+/g, "");
        clientLog("voice.set_question", { question, ignoredSame: same });
        if (question && !same) {
          this.wrong.clear();
          this.everWrong = false;
          this.selfSet = question;
          bus.emit("questionConfirmed", { text: question, kind: kindOf(question) });
        }
      } else if (fc.name === "write_line") {
        clientLog("voice.write_line", { text, duplicate });
        if (text && !duplicate) {
          this.remember([text]);
          bus.emit("writeLine", { text: text.slice(0, 44) });
        }
      }
      this.session?.sendToolResponse({
        functionResponses: { id: fc.id, name: fc.name, response: { ok: !duplicate, ...(duplicate ? { note: "already on the board; don't write it again, just refer to it" } : {}) } },
      });
    }
  }
}
