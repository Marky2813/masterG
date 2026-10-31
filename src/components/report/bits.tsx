import type { ReactNode } from "react";
import type { Outcome } from "@/lib/report/model";

// Small pieces of the report's "checked notebook" look. Red is the teacher's pen only.

// Tally marks in red pen: groups of four strokes and a slash, the way a teacher counts.
export function Tally({ count, className = "" }: { count: number; className?: string }) {
  const groups = Array.from({ length: Math.ceil(count / 5) }, (_, g) => Math.min(5, count - g * 5));
  return (
    <span className={`inline-flex items-center gap-2 ${className}`} aria-label={`${count} times`}>
      {groups.map((n, g) => (
        <svg key={g} viewBox="0 0 44 28" className="h-6 w-auto" aria-hidden="true">
          {Array.from({ length: Math.min(n, 4) }, (_, i) => (
            <path key={i} d={`M${7 + i * 9} ${4 + (i % 2)}c-1 6 1 13 0 ${19 - (i % 2)}`} fill="none" stroke="#C83A22" strokeWidth={3} strokeLinecap="round" />
          ))}
          {n === 5 && <path d="M2 21C14 15 28 10 42 5" fill="none" stroke="#C83A22" strokeWidth={3} strokeLinecap="round" />}
        </svg>
      ))}
    </span>
  );
}

// A rubber-stamp outcome on each question.
const STAMP: Record<Outcome, { text: string; cls: string }> = {
  first_try: { text: "First try", cls: "border-red-pen text-red-pen bg-paper" },
  fixed: { text: "Fixed it", cls: "border-red-pen text-red-pen bg-rabar-wash" },
  helped: { text: "With help", cls: "border-kohl text-kohl bg-peela" },
  unfinished: { text: "Not finished", cls: "border-muted text-muted bg-mist" },
  unchecked: { text: "Practised", cls: "border-muted text-muted bg-mist" },
};

export function Stamp({ outcome, className = "" }: { outcome: Outcome; className?: string }) {
  const s = STAMP[outcome];
  return (
    <span
      className={`inline-block -rotate-3 rounded-md border-[2.5px] px-2.5 py-0.5 font-display text-[13px] font-black tracking-[0.06em] whitespace-nowrap uppercase [font-stretch:112%] ${s.cls} ${className}`}
    >
      {s.text}
    </span>
  );
}

// Tick, gola-cross and question mark drawn as red-pen strokes beside each step.
export function StepMark({ status, className = "size-7" }: { status: "c" | "w" | "u"; className?: string }) {
  if (status === "u")
    return (
      <svg viewBox="0 0 32 32" className={className} aria-label="could not check">
        <path d="M10 11c0-4 3-6 6-6s6 2 6 5c0 4-6 5-6 9" fill="none" stroke="#4d4943" strokeWidth={3} strokeLinecap="round" />
        <circle cx="16" cy="26" r="1.8" fill="#4d4943" />
      </svg>
    );
  if (status === "c")
    return (
      <svg viewBox="0 0 32 32" className={className} aria-label="correct">
        <path d="M4 17c3 2 5 5 7 9C15 17 21 9 29 4" fill="none" stroke="#C83A22" strokeWidth={3.2} strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  return (
    <svg viewBox="0 0 32 32" className={className} aria-label="wrong">
      <path d="M7 7c6 5 12 12 18 19M25 6C19 12 12 19 7 26" fill="none" stroke="#C83A22" strokeWidth={3.2} strokeLinecap="round" />
    </svg>
  );
}

export function SectionTitle({ children, hand }: { children: ReactNode; hand?: string }) {
  return (
    <div className="mb-4 flex flex-wrap items-baseline gap-x-3 break-after-avoid">
      <h2 className="font-display text-[22px] leading-tight font-black [font-stretch:112%] md:text-[26px]">{children}</h2>
      {hand && <span className="font-hand text-lg font-bold text-red-pen">{hand}</span>}
    </div>
  );
}

export function Chip({ children, tone = "plain" }: { children: ReactNode; tone?: "plain" | "pink" | "yellow" | "red" }) {
  const cls = {
    plain: "border-kohl/70 bg-paper",
    pink: "border-kohl bg-rabar-wash",
    yellow: "border-kohl bg-peela",
    red: "border-red-pen bg-paper text-red-pen",
  }[tone];
  return <span className={`inline-flex items-center gap-1 rounded-full border-2 px-2.5 py-0.5 text-[13px] font-semibold ${cls}`}>{children}</span>;
}

// mathjs text as a person writes it: 3*x → 3x, 2*3 → 2 × 3.
export function pretty(t: string): string {
  return t
    .replace(/(\d)\s*\*\s*([a-z(])/gi, "$1$2")
    .replace(/\s*\*\s*/g, " × ")
    .replace(/\s*([=+])\s*/g, " $1 ")
    .replace(/(\S)-(\S)/g, "$1 − $2")
    .replace(/\s+/g, " ")
    .trim();
}
