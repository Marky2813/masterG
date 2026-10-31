"use client";

import { useState } from "react";
import { bus } from "@/lib/bus";
import type { QuestionKind } from "@/lib/types";

// Typed question input (first slice of #10). Typed text needs no extraction, so it's
// confirmed straight away; handwriting and photo input go through Flash later (#14).
function kindOf(text: string): QuestionKind {
  const letters = text.replace(/\b(lcm|hcf|gcd)\b/gi, "").match(/[a-z]/i);
  return text.includes("=") && letters ? "equation" : "chain";
}

export default function QuestionBox() {
  const [draft, setDraft] = useState("");
  const [confirmed, setConfirmed] = useState<string | null>(null);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const text = draft.trim();
    if (!text) return;
    bus.emit("questionSubmitted", { source: "typed", text });
    bus.emit("questionConfirmed", { text, kind: kindOf(text) });
    setConfirmed(text);
  };

  return (
    <form onSubmit={submit} className="flex items-center gap-2 rounded-lg border border-slate-300 bg-amber-50 p-3">
      <span className="text-sm font-semibold text-slate-700">Sawaal:</span>
      {confirmed ? (
        <>
          <span className="font-mono text-lg">{confirmed}</span>
          <button
            type="button"
            className="ml-auto rounded bg-slate-200 px-3 py-1 text-sm"
            onClick={() => {
              setConfirmed(null);
              setDraft(confirmed);
            }}
          >
            Change
          </button>
        </>
      ) : (
        <>
          <input
            className="flex-1 rounded border border-slate-300 bg-white px-2 py-1 font-mono"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="3/4 + 1/6   or   3x + 5 = 20"
          />
          <button className="rounded bg-slate-800 px-3 py-1 text-sm text-white">Set</button>
        </>
      )}
    </form>
  );
}
