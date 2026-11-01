"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { MasterjiVoice, type VoiceStatus } from "@/lib/voice/voiceService";
import { bus } from "@/lib/bus";
import type { Language } from "@/lib/types";

// Masterji at the bottom centre, where the child already looks and reaches: his latest words as a
// subtitle bubble, and under it the push-to-talk pill. Hold SPACE to talk. PLAN.md §6.
// (children: rendered above the bubble; /learn passes none now that the question sits top centre.)
export default function VoiceBar({ children }: { children?: ReactNode }) {
  const voiceRef = useRef<MasterjiVoice | null>(null);
  const [status, setStatus] = useState<VoiceStatus>("idle");
  const [detail, setDetail] = useState("");
  const [language, setLanguage] = useState<Language>("hinglish");
  const [masterji, setMasterji] = useState("");
  const [speaking, setSpeaking] = useState(false);
  const [talking, setTalking] = useState(false);

  useEffect(() => () => voiceRef.current?.stop(), []);

  const start = async () => {
    const v = new MasterjiVoice(language, {
      onStatus: (s, d) => {
        setStatus(s);
        setDetail(d ?? "");
      },
      // Only Masterji's words are shown. The kid's speech-to-text flips between Hindi and English
      // scripts and mishears digits ("6" came out as "sex"), so it stays in the logs, off screen.
      onCaption: (who, text) => {
        if (who === "masterji") setMasterji(text);
      },
      onSpeaking: setSpeaking,
    });
    voiceRef.current = v;
    try {
      await v.start();
    } catch (e) {
      setStatus("error");
      setDetail(e instanceof Error ? e.message : String(e));
    }
  };
  const stop = () => {
    voiceRef.current?.stop();
    voiceRef.current = null;
  };
  const toggleLanguage = () => {
    const next: Language = language === "hinglish" ? "english" : "hinglish";
    setLanguage(next);
    bus.emit("languageChanged", { language: next });
  };

  const down = () => {
    if (!voiceRef.current) return;
    setTalking(true);
    void voiceRef.current.startTalking();
  };
  const up = () => {
    setTalking(false);
    voiceRef.current?.stopTalking();
  };

  // Hold SPACE to talk (unless typing in a field). Pressing while Masterji talks stops him.
  useEffect(() => {
    const isField = (e: KeyboardEvent) => ["INPUT", "TEXTAREA"].includes((e.target as HTMLElement | null)?.tagName ?? "");
    const onDown = (e: KeyboardEvent) => {
      if (e.code !== "Space" || isField(e)) return;
      e.preventDefault();
      if (!e.repeat) down();
    };
    const onUp = (e: KeyboardEvent) => {
      if (e.code !== "Space" || isField(e)) return;
      e.preventDefault();
      up();
    };
    window.addEventListener("keydown", onDown);
    window.addEventListener("keyup", onUp);
    return () => {
      window.removeEventListener("keydown", onDown);
      window.removeEventListener("keyup", onUp);
    };
  });

  const live = status === "live" || status === "connecting";
  const state = !live
    ? { text: status === "error" ? "Error" : "Offline", dot: "bg-slate-300" }
    : status === "connecting"
      ? { text: "aa rahe hain…", dot: "bg-slate-300 animate-pulse" }
      : talking
        ? { text: "sun rahe hain", dot: "bg-sky-500 animate-pulse" }
        : speaking
          ? { text: "bol rahe hain", dot: "bg-amber-500 animate-pulse" }
          : { text: "dekh rahe hain", dot: "bg-emerald-500" };
  // the latest ~2-3 lines only, so the bubble stays small and off the board
  const shown = masterji.length > 170 ? "…" + masterji.slice(-170).replace(/^\S*\s/, "") : masterji;

  return (
    <div data-overlay="bottom" className="pointer-events-none fixed bottom-4 left-1/2 z-10 flex w-[min(40rem,calc(100vw-2rem))] -translate-x-1/2 flex-col items-center gap-2.5">
      {children}
      {(live || status === "error") && (
        <div className="pointer-events-auto flex w-full items-start gap-3 rounded-2xl border border-amber-200/80 bg-white/95 px-3.5 py-2.5 shadow-[0_4px_18px_rgba(120,90,20,0.12)] backdrop-blur">
          <div className="relative mt-0.5 shrink-0">
            <svg viewBox="0 0 40 40" className="size-9" aria-hidden="true">
              <rect x="3" y="3" width="34" height="34" rx="11" fill="#FFE36E" stroke="#161513" strokeWidth="2.2" />
              <circle cx="14" cy="17" r="4" fill="none" stroke="#161513" strokeWidth="2.2" />
              <circle cx="26" cy="17" r="4" fill="none" stroke="#161513" strokeWidth="2.2" />
              <path d="M14 26c2.5 2.4 9.5 2.4 12 0" fill="none" stroke="#161513" strokeWidth="2.2" strokeLinecap="round" />
            </svg>
            <span className={`absolute -right-0.5 -bottom-0.5 size-3 rounded-full ring-2 ring-white ${state.dot}`} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-[11px] font-semibold tracking-wide text-amber-800/80">
              Masterji <span className="font-normal text-slate-400">· {state.text}</span>
            </div>
            <div className="text-[15px] leading-snug text-slate-800" aria-live="polite">
              {shown || <span className="text-slate-400">…</span>}
            </div>
            {status === "error" && <div className="mt-0.5 text-[13px] text-rose-600">{detail}</div>}
          </div>
        </div>
      )}

      <div className="pointer-events-auto flex items-center gap-2">
        {live ? (
          <>
            <button
              className={`select-none rounded-full px-5 py-2.5 text-sm font-medium shadow-sm transition ${talking ? "bg-sky-600 text-white" : "border border-slate-200 bg-white/95 text-slate-700"}`}
              onPointerDown={down}
              onPointerUp={up}
              onPointerLeave={() => talking && up()}
            >
              {talking ? "🎙️ Listening… release to send" : "🎙️ Hold SPACE to talk"}
            </button>
            <button className="rounded-full border border-slate-200 bg-white/95 px-3 py-2.5 text-xs text-slate-500 shadow-sm" onClick={toggleLanguage}>
              {language === "hinglish" ? "Hinglish" : "English"}
            </button>
            <button className="rounded-full border border-slate-200 bg-white/95 px-3 py-2.5 text-xs text-slate-500 shadow-sm" onClick={stop}>
              End
            </button>
          </>
        ) : (
          <button className="rounded-full bg-slate-900 px-6 py-3 text-sm font-medium text-white shadow" onClick={start}>
            Start Masterji
          </button>
        )}
      </div>
    </div>
  );
}
