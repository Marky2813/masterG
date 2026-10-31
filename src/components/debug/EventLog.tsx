"use client";

import { useEffect, useState } from "react";
import { bus } from "@/lib/bus";
import type { MasterGEvents } from "@/lib/types";

// Read-only view of the real bus traffic (?debug=1). It only listens; it never emits.
type Entry = { n: number; at: string; event: keyof MasterGEvents; summary: string; image?: string };

const EVENTS: (keyof MasterGEvents)[] = [
  "clusterUpdated",
  "clusterRemoved",
  "questionSubmitted",
  "questionConfirmed",
  "verdict",
  "writeNote",
  "userUtterance",
  "modeChanged",
  "languageChanged",
];

export default function EventLog() {
  const [entries, setEntries] = useState<Entry[]>([]);

  useEffect(() => {
    let n = 0;
    const offs = EVENTS.map((event) =>
      bus.on(event, (payload: MasterGEvents[typeof event]) => {
        const p = payload as unknown as Record<string, unknown>;
        const { imagePng, ...rest } = p;
        const entry: Entry = {
          n: ++n,
          at: new Date().toLocaleTimeString(),
          event,
          summary: JSON.stringify(rest),
          image: typeof imagePng === "string" ? imagePng : undefined,
        };
        setEntries((e) => [entry, ...e].slice(0, 50));
      }),
    );
    return () => offs.forEach((off) => off());
  }, []);

  return (
    <aside className="flex max-h-[80vh] flex-col gap-2 overflow-y-auto rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs">
      <h2 className="font-semibold text-slate-700">Bus events (debug)</h2>
      {entries.length === 0 && <p className="text-slate-500">Write something and pause ~1.5 s.</p>}
      {entries.map((e) => (
        <div key={e.n} className="rounded border border-slate-200 bg-white p-2">
          <div className="font-mono">
            <span className="text-slate-400">{e.at}</span> <b>{e.event}</b>
          </div>
          <div className="break-all font-mono text-slate-600">{e.summary}</div>
          {e.image && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={e.image} alt="cluster crop" className="mt-1 max-h-24 border border-slate-200" />
          )}
        </div>
      ))}
    </aside>
  );
}
