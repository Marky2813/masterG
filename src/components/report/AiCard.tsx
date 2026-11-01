import type { AiSummary } from "@/lib/report/model";
import { pretty } from "./bits";

export type AiState = { kind: "idle" } | { kind: "loading" } | { kind: "error"; message: string } | { kind: "done"; summary: AiSummary };

// "For the teacher": the one AI-written part of the report. A yellow sticky note, labelled as AI,
// kept apart from the computed facts. Its practice-question answers come from our checker.
export interface AiCopy {
  title: string;
  source: string;
  lacking: string;
  next: string;
  worksheet: string;
  writing: string;
}

const CHILD_COPY: AiCopy = {
  title: "For the teacher",
  source: "Written by Gemini Flash from the facts on this page only. Answers to the practice questions are worked out by MasterG's maths checker, not the AI.",
  lacking: "Where the child is lacking",
  next: "Practise next",
  worksheet: "For the next worksheet",
  writing: "Masterji is writing a note for the teacher…",
};

export default function AiCard({ state, onWrite, canWrite, copy = CHILD_COPY }: { state: AiState; onWrite: () => void; canWrite: boolean; copy?: AiCopy }) {
  return (
    <section className="relative break-inside-avoid">
      <span aria-hidden="true" className="absolute -top-3 left-1/2 z-10 h-6 w-28 -translate-x-1/2 rotate-[-3deg] bg-rabar/80 shadow-sm print:hidden" />
      <div className="rounded-window border-[2.5px] border-kohl bg-peela p-5 shadow-hard-lg md:p-7 print:shadow-none">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-display text-[24px] leading-tight font-black [font-stretch:112%] md:text-[28px]">{copy.title}</h2>
          <span className="inline-flex items-center gap-1.5 rounded-full border-2 border-kohl bg-white px-3 py-1 text-xs font-bold tracking-wide uppercase">
            <svg viewBox="0 0 16 16" className="size-3.5" aria-hidden="true">
              <path d="M8 1l1.6 4.4L14 7l-4.4 1.6L8 13l-1.6-4.4L2 7l4.4-1.6z" fill="#161513" />
            </svg>
            AI summary
          </span>
        </div>
        <p className="mt-1 text-[13px] leading-snug text-kohl/75">
          {copy.source}
        </p>

        {state.kind === "done" ? (
          <div className="mt-5 grid gap-5">
            <div>
              <h3 className="font-hand text-lg font-bold text-red-pen">{copy.lacking}</h3>
              <p className="mt-1 text-[16px] leading-[1.55]">{state.summary.lacking}</p>
            </div>
            <div>
              <h3 className="font-hand text-lg font-bold text-red-pen">{copy.next}</h3>
              <p className="mt-1 text-[16px] leading-[1.55]">{state.summary.next}</p>
            </div>
            {state.summary.qs.length > 0 && (
              <div>
                <h3 className="font-hand text-lg font-bold text-red-pen">{copy.worksheet}</h3>
                <ol className="mt-2 grid gap-2">
                  {state.summary.qs.map((s, i) => (
                    <li key={i} className="flex items-start gap-3 rounded-control border-2 border-kohl bg-paper px-3 py-2.5">
                      <span className="font-display text-sm font-black text-muted">{i + 1}.</span>
                      <div className="min-w-0 flex-1">
                        <p className="font-display text-[19px] leading-tight font-black break-words">{pretty(s.q)}</p>
                        {s.why && <p className="mt-0.5 text-[13px] leading-snug text-muted">{s.why}</p>}
                      </div>
                      {s.a ? (
                        <span className="shrink-0 text-right text-[12px] leading-tight text-muted" title="Computed by the MasterG checker">
                          Answer
                          <span className="block font-hand text-[18px] font-bold text-kohl">{pretty(s.a)}</span>
                        </span>
                      ) : null}
                    </li>
                  ))}
                </ol>
              </div>
            )}
            <p className="text-[12px] text-kohl/60">Model: {state.summary.model}</p>
          </div>
        ) : state.kind === "loading" ? (
          <div className="mt-5 grid gap-3" aria-live="polite">
            <p className="font-hand text-xl font-bold">{copy.writing}</p>
            {[90, 75, 82].map((w) => (
              <span key={w} className="h-3 animate-pulse rounded-full bg-kohl/15" style={{ width: `${w}%` }} />
            ))}
          </div>
        ) : (
          <div className="mt-5 print:hidden">
            {state.kind === "error" && <p className="mb-3 text-sm font-semibold break-words text-red-pen">Couldn&apos;t write the summary: {state.message}</p>}
            {canWrite ? (
              <button
                onClick={onWrite}
                className="rounded-control border-[2.5px] border-kohl bg-white px-4 py-2.5 font-display font-black shadow-hard-sm transition-[transform,box-shadow] active:translate-x-1 active:translate-y-1 active:shadow-none"
              >
                {state.kind === "error" ? "Try again" : "Write the AI summary"}
              </button>
            ) : (
              <p className="text-sm text-kohl/75">Not enough written yet for a summary.</p>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
