"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { MasterjiVoice, type VoiceStatus } from "@/lib/voice/voiceService";
import type { Language } from "@/lib/types";

// Masterji at the bottom centre, where the child already looks and reaches: his latest words as a
// subtitle bubble, and under it the push-to-talk pill. Hold SPACE to talk. PLAN.md §6.
// (children: rendered above the bubble; /learn passes none now that the question sits top centre.)
export default function VoiceBar({ children }: { children?: ReactNode }) {
  const voiceRef = useRef<MasterjiVoice | null>(null);
  const [status, setStatus] = useState<VoiceStatus>("idle");
  const [detail, setDetail] = useState("");
  const language: Language = "hinglish"; // Masterji speaks Hinglish; the language switch left the UI
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
  // While he is on, the red End button takes the top-right corner; the notebook's toolbar moves left for it.
  useEffect(() => {
    if (live) document.documentElement.dataset.voiceLive = "1";
    else delete document.documentElement.dataset.voiceLive;
    return () => {
      delete document.documentElement.dataset.voiceLive;
    };
  }, [live]);
  const state = !live
    ? { text: status === "error" ? "error" : "offline", dot: "bg-slate-300" }
    : status === "connecting"
      ? { text: "connecting…", dot: "bg-slate-300 animate-pulse" }
      : talking
        ? { text: "listening", dot: "bg-rose-500 animate-pulse" }
        : speaking
          ? { text: "speaking", dot: "bg-amber-500 animate-pulse" }
          : { text: "watching", dot: "bg-emerald-500" };
  // the latest ~2-3 lines only, so the bubble stays small and off the board
  const shown = masterji.length > 170 ? "…" + masterji.slice(-170).replace(/^\S*\s/, "") : masterji;

  return (
    <>
      {live && (
        <button
          data-overlay="top"
          onClick={stop}
          title="End the session with Masterji"
          className="fixed top-4 right-4 z-20 flex h-[46px] items-center gap-1.5 rounded-xl bg-rose-600 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-rose-700 active:scale-95"
        >
          <span className="size-2.5 rounded-[3px] bg-white" aria-hidden="true" />
          End
        </button>
      )}

      <div data-overlay="bottom" className="pointer-events-none fixed bottom-4 left-1/2 z-10 flex w-[min(40rem,calc(100vw-2rem))] -translate-x-1/2 flex-col items-center gap-3">
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

        <div className="pointer-events-auto flex flex-col items-center gap-1">
          {live ? (
            <>
              <button
                aria-label="Hold to talk"
                title="Hold to talk (or hold Space)"
                className={`relative flex size-16 select-none items-center justify-center rounded-full shadow-lg transition active:scale-95 ${talking ? "bg-rose-500 text-white" : "bg-amber-400 text-slate-900 hover:bg-amber-300"}`}
                onPointerDown={down}
                onPointerUp={up}
                onPointerLeave={() => talking && up()}
                onContextMenu={(e) => e.preventDefault()}
              >
                {talking && <span className="absolute inset-0 animate-ping rounded-full bg-rose-400/60" aria-hidden="true" />}
                <svg viewBox="0 0 24 24" className="relative size-7" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <rect x="9" y="3" width="6" height="11" rx="3" fill="currentColor" />
                  <path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21" />
                </svg>
              </button>
              <span className="text-[11px] font-medium text-slate-500">{talking ? "Listening… let go to send" : "Hold to talk"}</span>
            </>
          ) : (
            <button className="flex h-12 items-center gap-2 rounded-full bg-slate-900 px-6 text-sm font-semibold text-white shadow-lg transition hover:bg-slate-800 active:scale-95" onClick={start}>
              <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
                <rect x="9" y="3" width="6" height="11" rx="3" fill="currentColor" />
                <path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21" />
              </svg>
              Start Masterji
            </button>
          )}
        </div>
      </div>
    </>
  );
}
