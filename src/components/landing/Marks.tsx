import type { CSSProperties, ReactNode } from "react";

// Red-pen marks and margin notes. Red is Masterji's colour only, so every mark
// here stands for a verdict or a note from him. Marks are hand-drawn strokes on a
// 100-unit grid, with a margin in the viewBox so nothing clips, stretched to their
// box with a constant stroke width.
//
// draw="load": the mark wipes on when the page opens (time-based, motion-safe).
// draw="view": it wipes on as it scrolls into view (scroll-linked, motion-safe).

export type Draw = "load" | "view";

// The two marks the live flow draws: a tick on a right step, a gola (loop) round a wrong one.
const PATHS = {
  tick: ["M12 54C20 60 27 70 33 80C44 58 62 30 90 14"],
  gola: ["M10 52C7 26 30 7 55 8C80 9 97 32 93 58C89 84 64 96 40 93C16 90 8 74 13 46"],
} as const;

type Name = keyof typeof PATHS;
type MarkProps = { className?: string; draw?: Draw; delay?: string };

export function inkClass(draw?: Draw): string {
  if (draw === "load") return "motion-safe:animate-ink";
  if (draw === "view") return "landing-ink-on-view";
  return "";
}

export function delayStyle(delay?: string): CSSProperties | undefined {
  return delay ? { animationDelay: delay } : undefined;
}

function Mark({ name, className = "", draw, delay }: MarkProps & { name: Name }) {
  return (
    <svg
      viewBox="-6 -6 112 112"
      preserveAspectRatio="none"
      aria-hidden="true"
      className={`pointer-events-none overflow-visible ${inkClass(draw)} ${className}`}
      style={delayStyle(delay)}
    >
      {PATHS[name].map((d) => (
        <path
          key={d}
          d={d}
          fill="none"
          stroke="#C83A22"
          strokeWidth={3.5}
          strokeLinecap="round"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
        />
      ))}
    </svg>
  );
}

export const Tick = (props: MarkProps) => <Mark name="tick" {...props} />;
export const Gola = (props: MarkProps) => <Mark name="gola" {...props} />;

// A margin note in red Kalam, the way Masterji writes beside a step.
export function Note({
  children,
  className = "",
  draw,
  delay,
}: {
  children: ReactNode;
  className?: string;
  draw?: Draw;
  delay?: string;
}) {
  return (
    <span
      className={`font-hand font-bold text-red-pen ${inkClass(draw)} ${className}`}
      style={delayStyle(delay)}
    >
      {children}
    </span>
  );
}
