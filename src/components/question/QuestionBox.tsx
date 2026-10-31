"use client";

import { useEffect, useState } from "react";
import { bus } from "@/lib/bus";
import { kindOf } from "@/lib/brain/kind";

// Typed question input (first slice of #10). Typed text needs no extraction, so it's
// confirmed straight away; handwriting and photo input go through Flash later (#14).


export default function QuestionBox() {
  const [draft, setDraft] = useState("");
  const [confirmed, setConfirmed] = useState<string | null>(null);
  // Masterji can set the next question himself (set_question tool).
  useEffect(() => bus.on("questionConfirmed", ({ text }) => setConfirmed(text)), []);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const text = draft.trim();
    if (!text) return;
    bus.emit("questionSubmitted", { source: "typed", text });
    bus.emit("questionConfirmed", { text, kind: kindOf(text) });
    setConfirmed(text);
  };

  return (
    <form onSubmit={submit} className="flex items-center gap-2 self-start rounded-lg border border-slate-200 bg-white/95 px-3 py-1.5 shadow-sm backdrop-blur">
      {confirmed ? (
        <button type="button" className="font-mono text-base text-slate-800" title="Change the question" onClick={() => { setConfirmed(null); setDraft(confirmed); }}>
          {confirmed}
        </button>
      ) : (
        <>
          <input
            className="w-56 bg-transparent font-mono text-sm outline-none placeholder:text-slate-400"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Sawaal likho: 3/4 + 1/6"
          />
          <button className="rounded-md bg-slate-900 px-2 py-0.5 text-xs text-white">Set</button>
        </>
      )}
    </form>
  );
}
