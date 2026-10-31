"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { MasterjiVoice, type VoiceStatus } from "@/lib/voice/voiceService";
import { bus } from "@/lib/bus";
import type { Language } from "@/lib/types";

// Floating Masterji card (top left): status pill, live captions, the question chip below,
// and the push-to-talk pill (bottom centre). Hold SPACE to talk. PLAN.md §6.
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
  const pill = !live
    ? { text: status === "error" ? "Error" : "Offline", cls: "bg-slate-200 text-slate-600" }
    : status === "connecting"
      ? { text: "Connecting", cls: "bg-slate-200 text-slate-600" }
      : talking
        ? { text: "Listening", cls: "bg-sky-600 text-white" }
        : speaking
          ? { text: "Speaking", cls: "bg-amber-700 text-white" }
          : { text: "Watching", cls: "bg-emerald-600 text-white" };

  return (
    <>
      <div data-overlay="top" className="fixed left-4 top-4 z-10 flex w-[min(28rem,calc(100vw-2rem))] flex-col gap-2">
        <div className="rounded-xl border border-amber-200/70 bg-white/95 p-2.5 shadow-sm backdrop-blur">
          <div className="flex items-start gap-2">
            <span className={`shrink-0 rounded-md px-2 py-0.5 text-xs font-semibold ${pill.cls}`}>{pill.text}</span>
            <div className="min-w-0 flex-1 text-[13px] leading-snug">
              {masterji ? (
                <div className="text-slate-800">
                  <span className="font-semibold text-amber-700">Masterji · </span>
                  {/* the latest ~3 lines only, so the card stays small and off the board */}
                  {masterji.length > 190 ? "…" + masterji.slice(-190).replace(/^\S*\s/, "") : masterji}
                </div>
              ) : (
                <div className="text-slate-400">{live ? "…" : "Masterji is offline"}</div>
              )}
              {status === "error" && <div className="mt-0.5 text-rose-600">{detail}</div>}
            </div>
          </div>
        </div>
        {children}
      </div>

      {/* bottom centre: start / push-to-talk */}
      <div data-overlay="bottom" className="fixed bottom-5 left-1/2 z-10 flex -translate-x-1/2 items-center gap-2">
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
    </>
  );
}
