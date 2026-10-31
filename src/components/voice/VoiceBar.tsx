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

  const [talking, setTalking] = useState(false);
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
            className={`select-none rounded px-4 py-1 font-medium ${talking ? "bg-sky-500 text-black" : "bg-slate-700"}`}
            onPointerDown={down}
            onPointerUp={up}
            onPointerLeave={() => talking && up()}
            title="Hold SPACE or this button to talk"
          >
            {talking ? "🎙️ Bol rahe ho… (chhodo to send)" : "🎙️ Hold SPACE to talk"}
          </button>
        )}
        <span className="text-xs text-slate-400">{live && speaking ? "🔊 Masterji" : ""}</span>
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
