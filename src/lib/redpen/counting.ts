// Counting sticks for Classes 1-2: "2 + 3" drawn as | |  +  | | |  =  5, then every stick
// counted with a small number above it (1, 2, 3, 4, 5) at a speaking pace, and the answer circled.
// Subtraction crosses out the sticks taken away, then counts what is left.
// The numbers come from code, never from the model. Pure: (spec, origin) -> one timed PenItem.
import { mark, rng, text, type AnimatedStroke, type PenItem, type Pt } from "./index";

export interface CountingSpec {
  a: number;
  b: number;
  op: "+" | "-";
}

export const MAX_STICKS = 10; // per group; more than this isn't counting any more

export function validCounting(a: unknown, b: unknown, op: unknown): CountingSpec | null {
  const ok = (n: unknown): n is number => typeof n === "number" && Number.isInteger(n) && n >= 0 && n <= MAX_STICKS;
  if (!ok(a) || !ok(b) || (op !== "+" && op !== "-")) return null;
  if (op === "-" && b > a) return null;
  return { a, b, op };
}

const STICK_H = 60;
const STICK_GAP = 24;
const COUNT_MS = 420; // one number per stick, about the pace of "ek, do, teen"

export function counting(spec: CountingSpec, origin: { x: number; y: number }, seed?: number): PenItem & { width: number; height: number } {
  const r = rng(seed);
  const j = (n: number) => (r() - 0.5) * n;
  const out: AnimatedStroke[] = [];
  let t = 0;
  const line = (points: Pt[], ms: number, gap = 60) => {
    out.push({ points, delay: t, duration: ms });
    t += ms + gap;
  };
  const addText = (s: string, x: number, y: number, size: number, gap = 80) => {
    const it = text(s, x, y, size, Math.floor(r() * 1e6)).item;
    for (const st of it.strokes) out.push({ ...st, delay: st.delay + t });
    t += it.total + gap;
  };
  const top = origin.y + 40; // room for the count numbers above the sticks
  const bottom = top + STICK_H;
  let x = origin.x;
  const sticks: number[] = []; // x of every stick, in order
  const group = (n: number) => {
    const xs: number[] = [];
    for (let i = 0; i < n; i++) {
      if (i > 0 && i % 5 === 0) x += 12; // a little gap after every five
      const sx = x + j(3);
      line([[sx + j(2), top + j(4)], [sx + j(2), (top + bottom) / 2], [sx + j(2), bottom + j(4)]], 170);
      xs.push(sx);
      x += STICK_GAP;
    }
    // the group's number, small, under it
    if (n > 0) addText(String(n), (xs[0] + xs[xs.length - 1]) / 2 - 7, bottom + 34, 22);
    return xs;
  };
  const symbol = (s: string) => {
    x += 14;
    addText(s, x, (top + bottom) / 2 + 14, 36, 120);
    x += 50;
  };

  const first = group(spec.a);
  sticks.push(...first);
  symbol(spec.op);
  let remaining = first;
  if (spec.op === "+") {
    sticks.push(...group(spec.b));
    remaining = sticks;
  } else {
    // take away: cross out the last b sticks one by one, then write how many were taken
    const gone = first.slice(first.length - spec.b);
    for (const sx of gone) line([[sx - 10, bottom - 6], [sx + 12, top + 6]], 220, 120);
    addText(String(spec.b), x, (top + bottom) / 2 + 14, 36);
    x += 40;
    remaining = first.slice(0, first.length - spec.b);
  }
  symbol("=");
  // count: 1, 2, 3, ... above each stick that's left
  remaining.forEach((sx, i) => {
    const n = String(i + 1);
    const it = text(n, sx - (n.length > 1 ? 10 : 5), top - 10, 18, Math.floor(r() * 1e6)).item;
    for (const st of it.strokes) out.push({ ...st, delay: st.delay + t });
    t += Math.max(it.total, COUNT_MS);
  });
  t += 200;
  // the answer, circled
  const answer = String(spec.op === "+" ? spec.a + spec.b : spec.a - spec.b);
  const ax = x + 18;
  addText(answer, ax, (top + bottom) / 2 + 16, 42, 60);
  const aw = 26 * answer.length;
  const circle = mark("circle", { x: ax - 6, y: top + 4, w: aw + 12, h: STICK_H - 8 }, Math.floor(r() * 1e6));
  for (const st of circle.strokes) out.push({ ...st, delay: st.delay + t });
  t += circle.total;
  return { strokes: out, total: t, width: ax + aw + 30 - origin.x, height: bottom + 50 - origin.y };
}
