"use client";

import { useEffect, useState } from "react";
import Notebook from "@/components/notebook/Notebook";
import QuestionBox from "@/components/question/QuestionBox";
import EventLog from "@/components/debug/EventLog";
import VoiceBar from "@/components/voice/VoiceBar";
import { startStepService } from "@/lib/brain/stepService";

// Main screen. The full app shell (start screen, captions, toggles) comes in #12.
export default function Home() {
  const [debug, setDebug] = useState(false);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- read once after mount; window isn't available during prerender
    setDebug(new URLSearchParams(window.location.search).has("debug"));
  }, []);
  useEffect(() => startStepService(), []);

  return (
    <main className="mx-auto flex w-full max-w-7xl gap-4 p-4 text-slate-900">
      <div className="flex min-w-0 flex-1 flex-col gap-3">
        <h1 className="text-xl font-semibold">Master G</h1>
        <QuestionBox />
        <Notebook debug={debug} />
        <div className="sticky bottom-2">
          <VoiceBar />
        </div>
      </div>
      {debug && (
        <div className="w-80 shrink-0">
          <EventLog />
        </div>
      )}
    </main>
  );
}
