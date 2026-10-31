"use client";

import { useEffect, useRef, useState } from "react";
import { MasterjiVoice, type VoiceStatus } from "@/lib/voice/voiceService";
import { bus } from "@/lib/bus";
import type { Language } from "@/lib/types";

// Start/stop Masterji, language toggle, and the two-line caption bar (PLAN.md §6 Captions).
export default function VoiceBar() {
  const voiceRef = useRef<MasterjiVoice | null>(null);
  const [status, setStatus] = useState<VoiceStatus>("idle");
  const [detail, setDetail] = useState("");
  const [language, setLanguage] = useState<Language>("hinglish");
  const [masterji, setMasterji] = useState("");
  const [kid, setKid] = useState("");
  const [speaking, setSpeaking] = useState(false);

  useEffect(() => () => voiceRef.current?.stop(), []);

  // Spacebar = "Ruko": stop Masterji and talk (unless typing in a field).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      if (e.code !== "Space" || el?.tagName === "INPUT" || el?.tagName === "TEXTAREA") return;
      e.preventDefault();
      voiceRef.current?.interrupt();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const start = async () => {
    const v = new MasterjiVoice(language, {
      onStatus: (s, d) => {
        setStatus(s);
        setDetail(d ?? "");
      },
      onCaption: (who, text) => (who === "masterji" ? setMasterji(text) : setKid(text)),
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

  const live = status === "live" || status === "connecting";

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-slate-300 bg-slate-900 p-3 text-white">
      <div className="flex items-center gap-2 text-sm">
        {live ? (
          <button className="rounded bg-rose-600 px-3 py-1" onClick={stop}>
            Stop Masterji
          </button>
        ) : (
          <button className="rounded bg-emerald-600 px-3 py-1 font-medium" onClick={start}>
            Start Masterji 🎙️
          </button>
        )}
        {live && (
          <button
            className={`rounded px-3 py-1 ${speaking ? "bg-amber-500 text-black" : "bg-slate-700 text-slate-400"}`}
            onClick={() => voiceRef.current?.interrupt()}
            title="Spacebar"
          >
            ✋ Ruko (space)
          </button>
        )}
        <span className="text-xs text-slate-400">{live ? (speaking ? "🔊 Masterji bol rahe hain (mic paused)" : "🎙️ sun rahe hain") : ""}</span>
        <button className="rounded bg-slate-700 px-3 py-1" onClick={toggleLanguage}>
          {language === "hinglish" ? "Hinglish" : "English"}
        </button>
        <span className="ml-auto font-mono text-xs text-slate-400">
          {status}
          {detail ? `: ${detail}` : ""}
        </span>
      </div>
      <div className="min-h-[3.5rem] space-y-1">
        <div className="text-lg leading-snug">
          <span className="mr-2 text-amber-400">Masterji:</span>
          {masterji}
        </div>
        <div className="text-base leading-snug text-slate-300">
          <span className="mr-2 text-sky-400">You:</span>
          {kid}
        </div>
      </div>
    </div>
  );
}
