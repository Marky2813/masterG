import { categoryLabel, formatDuration, maxRung, taughtMethod, topicOf, visibleSteps, type Outcome, type ReportQuestion } from "@/lib/report/model";
import { Chip, Stamp, StepMark, pretty } from "./bits";

const RUNG = ["", "pointed at the step", "narrowed it down", "led to the method", "showed the step"];

// One question as a checked notebook page: the steps Masterji read, each with his red-pen mark,
// the mistake written in the margin, and what help it took.
export default function QuestionCard({ q, index, outcome }: { q: ReportQuestion; index: number; outcome: Outcome }) {
  const steps = visibleSteps(q);
  const rung = maxRung(q);
  const m = q.m ?? {};
  const shown = [m.l ? `${m.l} line${m.l > 1 ? "s" : ""}` : "", m.g ? "graph" : "", m.s ? "counting sticks" : ""].filter(Boolean);
  return (
    <article className="break-inside-avoid overflow-hidden rounded-window border-[2.5px] border-kohl bg-paper shadow-hard print:shadow-none">
      <header className="flex items-start gap-3 border-b-[2.5px] border-kohl px-4 py-3">
        <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full border-2 border-kohl bg-peela font-display text-sm font-black">
          {index + 1}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold tracking-wide text-muted uppercase">
            {topicOf(q.q, q.k)}
            {q.hw && ` · Homework ${q.hw.i}/${q.hw.n}${q.hw.ti ? ` · ${q.hw.ti}` : ""}`}
          </p>
          <p className="font-display text-[22px] leading-tight font-black break-words [font-stretch:105%]">
            {q.q ? pretty(q.q) : <span className="text-muted">Free practice (no question set)</span>}
          </p>
        </div>
        <Stamp outcome={outcome} className="mt-1 shrink-0" />
      </header>

      <div className="landing-sheet relative">
        <span aria-hidden="true" className="absolute inset-y-0 left-[44px] w-px bg-margin" />
        {steps.length === 0 ? (
          <p className="py-[10px] pr-4 pl-[58px] font-hand text-lg leading-[24px] text-muted">Nothing written on this one.</p>
        ) : (
          <ol>
            {steps.map((s, i) => (
              <li key={i} className="relative min-h-[44px] py-[6px] pr-3 pl-[58px]">
                <StepMark status={s.s} className={`absolute top-[8px] left-[8px] size-7 ${s.x ? "opacity-40" : ""}`} />
                <p className={`font-hand text-[22px] leading-[32px] break-words text-pencil ${s.x ? "text-muted line-through decoration-red-pen/60" : ""}`}>
                  {pretty(s.t) || <span className="text-muted">(could not read)</span>}
                  {s.x && <span className="ml-2 align-middle font-body text-xs font-semibold text-muted no-underline">erased</span>}
                  {s.s === "c" && s.w && !s.x && <span className="ml-2 align-middle font-body text-xs font-semibold text-red-pen">corrected</span>}
                </p>
                {s.w && s.c && (
                  <p className="font-hand text-[17px] leading-[22px] font-bold text-red-pen">
                    ↳ {categoryLabel(s.c, s.l)}
                  </p>
                )}
                {s.h && <p className="text-[13px] leading-5 text-muted">✎ Handwriting: {s.h}</p>}
              </li>
            ))}
          </ol>
        )}
      </div>

      <footer className="flex flex-wrap gap-1.5 border-t-2 border-kohl/15 bg-white px-4 py-3">
        <Chip>⏱ {formatDuration(q.t1 - q.t0)}</Chip>
        {rung > 0 && (
          <Chip tone={rung >= 4 ? "pink" : "plain"}>
            Hint {rung}/4 · {RUNG[rung]}
          </Chip>
        )}
        {(q.n ?? 0) > 0 && <Chip tone="pink">Said “I don’t know”{q.n! > 1 ? ` ×${q.n}` : ""}</Chip>}
        {taughtMethod(q) && <Chip tone="yellow">Masterji taught the method{shown.length > 0 && ` (${shown.join(", ")})`}</Chip>}
        {(m.n ?? 0) > 0 && <Chip>{m.n} margin note{m.n! > 1 ? "s" : ""}</Chip>}
      </footer>
    </article>
  );
}
