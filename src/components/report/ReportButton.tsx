"use client";

import { LOCAL_KEY, snapshot } from "@/lib/report/recorder";

// Toolbar button on /learn: saves this session's report locally and opens it in a new tab.
// The report page turns it into a share link (#r=...) itself.
export default function ReportButton() {
  const open = () => {
    const r = snapshot();
    try {
      if (r) localStorage.setItem(LOCAL_KEY, JSON.stringify(r));
    } catch {
      // storage blocked: the report tab will show its empty state
    }
    window.open("/report#local", "_blank");
  };
  return (
    <button
      onClick={open}
      title="Teacher / parent report for this session"
      className="flex h-9 min-w-9 items-center justify-center rounded-lg px-2 text-sm text-slate-600 transition hover:bg-slate-100"
    >
      📋 Report
    </button>
  );
}
