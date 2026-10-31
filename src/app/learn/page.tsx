"use client";

import { useEffect, useState } from "react";
import Notebook from "@/components/notebook/Notebook";
import RoughPad from "@/components/notebook/RoughPad";
import QuestionBox from "@/components/question/QuestionBox";
import EventLog from "@/components/debug/EventLog";
import VoiceBar from "@/components/voice/VoiceBar";
import { startStepService } from "@/lib/brain/stepService";
import "@/lib/sessionState";

// Full-screen whiteboard with Masterji floating on top.
export default function Home() {
  const [debug, setDebug] = useState(false);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- read once after mount; window isn't available during prerender
    setDebug(new URLSearchParams(window.location.search).has("debug"));
  }, []);
  useEffect(() => startStepService(), []);

  return (
    <main className="text-slate-900">
      <Notebook debug={debug} />
      <RoughPad />
      <VoiceBar>
        <QuestionBox />
      </VoiceBar>
      {debug && (
        <div className="fixed bottom-20 right-4 z-10 w-80">
          <EventLog />
        </div>
      )}
    </main>
  );
}
