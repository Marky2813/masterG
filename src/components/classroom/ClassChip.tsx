"use client";

import { useEffect, useState } from "react";
import { getMembership, startClassSync, type Membership, type SyncState } from "@/lib/classroom/client";

// Toolbar chip on /learn: which class this device is in and whether the teacher has the latest work.
// Starts the sync. Not in a class: a small "Join class" link, and nothing is sent anywhere.
export default function ClassChip() {
  const [m, setM] = useState<Membership | null>(null);
  const [sync, setSync] = useState<SyncState>({ kind: "off" });

  useEffect(() => {
    setM(getMembership()); // eslint-disable-line react-hooks/set-state-in-effect -- localStorage is only readable after mount
    return startClassSync(setSync);
  }, []);

  if (!m)
    return (
      <a href="/join" title="Join your teacher's class" className="flex h-9 items-center rounded-lg px-2 text-sm text-slate-600 transition hover:bg-slate-100">
        🏫 Join class
      </a>
    );
  const dot = sync.kind === "saved" ? "bg-emerald-500" : sync.kind === "error" ? "bg-red-500" : "bg-slate-300";
  const title =
    sync.kind === "saved" ? `Sent to your teacher at ${new Date(sync.at).toLocaleTimeString()}` : sync.kind === "error" ? `Not sent: ${sync.message}` : "Your work goes to your teacher as you practise";
  return (
    <a href="/join" title={title} className="flex h-9 max-w-[14rem] items-center gap-1.5 rounded-lg px-2 text-sm text-slate-600 transition hover:bg-slate-100">
      <span className={`size-2 shrink-0 rounded-full ${dot}`} aria-hidden="true" />
      <span className="truncate">
        🏫 {m.className} · {m.name}
      </span>
    </a>
  );
}
