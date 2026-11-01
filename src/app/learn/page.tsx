"use client";

import { useEffect, useState } from "react";
import Notebook from "@/components/notebook/Notebook";
import RoughPad from "@/components/notebook/RoughPad";
import QuestionBox from "@/components/question/QuestionBox";
import EventLog from "@/components/debug/EventLog";
import VoiceBar from "@/components/voice/VoiceBar";
import { startStepService } from "@/lib/brain/stepService";
import { startReportRecorder } from "@/lib/report/recorder";
import ReportButton from "@/components/report/ReportButton";
import ClassChip from "@/components/classroom/ClassChip";
import "@/lib/sessionState";

// Full-screen whiteboard with Masterji floating on top.
export default function Home() {
  const [debug, setDebug] = useState(false);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- read once after mount; window isn't available during prerender
    setDebug(new URLSearchParams(window.location.search).has("debug"));
  }, []);
  useEffect(() => startStepService(), []);
  useEffect(() => startReportRecorder(), []);

  return (
    <main className="text-slate-900">
      <Notebook debug={debug} />
      <RoughPad />
      {/* top left: the class and the report (for grown-ups); top centre: the question */}
      <div data-overlay="top" className="fixed top-4 left-4 z-10 flex items-center gap-1 rounded-xl border border-slate-200 bg-white/95 p-1 shadow-sm backdrop-blur">
        <ClassChip />
        <ReportButton />
      </div>
      <div data-overlay="top" className="fixed top-4 left-1/2 z-20 w-max max-w-[calc(100vw-2rem)] -translate-x-1/2 max-lg:top-16">
        <QuestionBox />
      </div>
      <VoiceBar />
      {debug && (
        <div className="fixed bottom-20 right-4 z-10 w-80">
          <EventLog />
        </div>
      )}
    </main>
  );
}
