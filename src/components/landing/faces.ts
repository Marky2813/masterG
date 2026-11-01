// The six faces of the maths cube and "Today's question" each one picks.
// `q` is the mathjs text the notebook gets (/learn?q=…); `text` is how the card writes it.
// Each `q` has a checker reference answer (referenceAnswer in src/lib/checker.ts), checked
// when these were chosen: 83, 56, 63, 12, 11/12, 20.
export interface Face {
  sym: string;
  x: number; // cube angles that bring this face to the front
  y: number;
  op: string;
  q: string;
  text: string;
  bg: string;
  fg: string;
}

export const FACES: Face[] = [
  { sym: "+", x: 0, y: 0, op: "Add", q: "38 + 45", text: "38 + 45 = ?", bg: "var(--color-peela)", fg: "var(--color-kohl)" },
  { sym: "×", x: 0, y: 270, op: "Multiply", q: "7 * 8", text: "7 × 8 = ?", bg: "var(--color-rabar)", fg: "var(--color-kohl)" },
  { sym: "−", x: 0, y: 180, op: "Subtract", q: "100 - 37", text: "100 − 37 = ?", bg: "var(--color-red-pen)", fg: "#FFFFFF" },
  { sym: "÷", x: 0, y: 90, op: "Divide", q: "84 / 7", text: "84 ÷ 7 = ?", bg: "var(--color-paper)", fg: "var(--color-kohl)" },
  { sym: "=", x: 270, y: 0, op: "Add fractions", q: "2/3 + 1/4", text: "2/3 + 1/4 = ?", bg: "var(--color-kohl)", fg: "var(--color-peela)" },
  { sym: "%", x: 90, y: 0, op: "Percentages", q: "25% * 80", text: "25% × 80 = ?", bg: "var(--color-kohl)", fg: "var(--color-rabar)" },
];

/** Index of the '=' face: the cube turns to it for the fractions lesson. */
export const EQUALS_FACE = 4;

export const solveHref = (f: Face) => `/learn?q=${encodeURIComponent(f.q)}`;

// Single-stroke "pencil" glyphs on a 40-unit-tall box: [width, path].
const G: Record<string, [number, string]> = {
  "0": [30, "M17 7c-7-2-12 6-12 15 0 8 3 14 9.5 14 6.5 0 10-7 10-15 0-7-3-13-9-13.5-2 0-3.5 .8-4.5 2"],
  "1": [22, "M7.5 11.5c2.5-1.5 4.5-3.5 6-6.5.3 9 .2 20-.5 31"],
  "2": [30, "M6.5 12.5c1-5 5-8 9.5-7.5 5 .5 7.5 5 5.5 9.5-2 4.5-8.5 10-15.5 20.5 5-.8 11-.6 18 .4"],
  "3": [30, "M7 9.5c3.5-4.5 11-5.5 14-2 3 3.5-.5 9-7.5 10.5 7-.8 11.5 2.5 10.5 9-1 7.5-12 9.5-17 4"],
  "4": [30, "M18 6c-4 7-8.5 13-13.5 19.5 6 .3 13-.2 20-1M19.5 13.5c-.5 7.5-.3 15 .5 22.5"],
  "5": [30, "M22.5 6c-4.5.3-9 .3-13 .8-.8 4-1.5 7.5-2.2 11 5-3.5 12-3.5 15 1 3 4.5 1 12-5 14.5-4.5 1.8-9 .5-11.5-2.5"],
  "6": [30, "M21 6.5c-9 2-15 10-15.5 18-.5 7 3 11.5 9 11.5 5.5 0 9-4 8.5-8.5-.5-5-6-7.5-11.5-5-3 1.4-5 4-6 6"],
  "7": [30, "M5.5 8c6.5-.8 13-1 19.5-.5-5 8.5-9.5 18-12 28.5"],
  "8": [30, "M16.5 6.5c-6-1.5-10 2-9 6.5 1 4 8 5.5 9.5 8.5 2 4 .5 13-6 13.5-5.5.5-7.5-4-5.5-8 2.5-4.5 9-6 11-10.5 2-4.5-.5-9.5-6-10"],
  "9": [30, "M22 11c-1.5-5-9-6.5-12.5-3-3.5 3.5-2.5 10 3 11 4.5.8 8-1.5 9.5-6.5.5 8 0 16-1.5 23.5"],
  "+": [28, "M14 14.5c.2 5 .1 9.5-.3 14M7.5 21.8c4.5-.3 9-.5 13.5-.2"],
  "−": [28, "M7 22c4.5-.4 9-.5 14-.2"],
  "×": [28, "M9 16c3.5 3.5 7 7.5 10.5 11.5M19.5 15.5c-3.5 3.5-7.5 8-10.5 12.5"],
  "÷": [28, "M7 22c4.5-.4 9-.5 14-.2M14 14.6v1.4M14 28.2v1.4"],
  "=": [28, "M7.5 18.5c4.5-.4 9-.4 13.5-.1M7 25.5c4.5-.3 9.5-.4 14.5 0"],
  "?": [26, "M7.5 12c.5-5 5-7.5 9-7 4.5.5 6.5 5 4 8.5-2 3-5.5 4-5.5 9.5M15.2 32.6v1.4"],
  "/": [24, "M19.5 6.5c-4.5 9.5-9 19-13 29.5"],
  "%": [32, "M7 33.5c6.5-9 13-18 18.5-26.5M10 7c-2.5 0-4 2-4 4.2s1.6 4 4 3.8c2.3-.2 3.6-2 3.4-4.2-.2-2.2-1.5-3.8-3.4-3.8zM22 25.5c-2.5 0-4 2-4 4.2s1.6 4 4 3.8c2.3-.2 3.6-2 3.4-4.2-.2-2.2-1.5-3.8-3.4-3.8z"],
  " ": [10, ""],
};
const QUICK = new Set(["1", "/", "−", "7"]);

export interface Glyph {
  d: string;
  vb: number;
  w: string;
  s: string;
  rot: string;
  dy: string;
  delay: string;
  dur: string;
}

/** The question written out stroke by stroke, with a little hand-wobble per glyph. */
export function glyphsFor(text: string): { glyphs: Glyph[]; end: string } {
  const out: Glyph[] = [];
  let t = 0.35;
  Array.from(text).forEach((c, i) => {
    const g = G[c] ?? G[" "];
    const dur = c === " " ? 0.01 : QUICK.has(c) ? 0.22 : 0.38;
    out.push({
      d: g[1],
      vb: g[0],
      w: (g[0] * 1.2).toFixed(1),
      s: (1 + (((i * 29) % 5) - 2) * 0.025).toFixed(3),
      rot: ((((i * 37) % 7) - 3) * 0.9).toFixed(1),
      dy: ((((i * 53) % 5) - 2) * 0.9).toFixed(1),
      delay: t.toFixed(2),
      dur: dur.toFixed(2),
    });
    t += c === " " ? 0.06 : dur * 0.85 + 0.04;
  });
  return { glyphs: out, end: (t + 0.1).toFixed(2) };
}
