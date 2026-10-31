// Faded maths symbols drifting behind the hero, as in the style guide's landing
// ground. Positions are fixed (no randomness), so the static render is stable.
// Decorative only: hidden from assistive technology.
const GLYPHS = [
  { ch: "÷", top: "6%", left: "46%", size: 46, color: "#D6D1C6", delay: "0s", extra: "" },
  { ch: "×", top: "10%", left: "93%", size: 40, color: "#F5B3C1", delay: "-4s", extra: "" },
  { ch: "+", top: "80%", left: "3%", size: 52, color: "#FFE36E", delay: "-2s", extra: "hidden md:block" },
  { ch: "=", top: "88%", left: "42%", size: 40, color: "#D6D1C6", delay: "-6s", extra: "hidden md:block" },
  { ch: "½", top: "66%", left: "56%", size: 40, color: "#FFE36E", delay: "-3s", extra: "hidden md:block" },
  { ch: "−", top: "32%", left: "91%", size: 34, color: "#D6D1C6", delay: "-7s", extra: "hidden md:block" },
  { ch: "%", top: "92%", left: "90%", size: 40, color: "#F5B3C1", delay: "-5s", extra: "hidden md:block" },
];

export default function GlyphField() {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden select-none">
      {GLYPHS.map((g) => (
        <span
          key={`${g.ch}-${g.top}-${g.left}`}
          className={`absolute font-display leading-none font-black motion-safe:animate-float ${g.extra}`}
          style={{ top: g.top, left: g.left, fontSize: g.size, color: g.color, animationDelay: g.delay }}
        >
          {g.ch}
        </span>
      ))}
    </div>
  );
}
