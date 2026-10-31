"use client";

import { useEffect, useState } from "react";
import Notebook from "@/components/notebook/Notebook";
import EventLog from "@/components/debug/EventLog";

// Main screen. The full app shell (question box, captions, toggles) comes in #12.
export default function Home() {
  const [debug, setDebug] = useState(false);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- read once after mount; window isn't available during prerender
    setDebug(new URLSearchParams(window.location.search).has("debug"));
  }, []);

  return (
    <main className="mx-auto flex w-full max-w-7xl gap-4 p-4 text-slate-900">
      <div className="min-w-0 flex-1">
        <h1 className="mb-2 text-xl font-semibold">Master G</h1>
        <Notebook debug={debug} />
      </div>
      {debug && (
        <div className="w-80 shrink-0">
          <EventLog />
        </div>
      )}
    </main>
  );
}
