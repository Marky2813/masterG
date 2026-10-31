// Hand-drawn graph for Masterji's red pen: axes with ticks, each line plotted from its
// expression (mathjs), and the crossing point circled and dropped to the x-axis.
// Pure: (spec, box) -> one timed PenItem, drawn stroke by stroke like a teacher at the board.
import { compile } from "mathjs";
import { mark, rng, text, type AnimatedStroke, type PenItem, type Pt } from "./index";

export interface GraphSpec {
  lines: { expr: string; label?: string }[]; // "3x + 5", "20"
  xMin?: number;
  xMax?: number;
  markX?: number; // where to circle the crossing
}

const asMath = (e: string) =>
  e
    .replace(/[−–]/g, "-")
    .replace(/×/g, "*")
    .replace(/÷/g, "/")
    .replace(/(\d)\s*([a-z(])/gi, "$1*$2")
    .replace(/\)\s*([a-z(\d])/gi, ")*$1");

export interface PlotLine {
  f: (x: number) => number;
  label: string;
}

// One line from the model, in whatever shape it comes: "3x + 5", "y = 2 - 4x", "8x + 2y = 4"
// (solved for y) or "3x + 5 = 20" (both sides become lines). Lines that don't evaluate are dropped:
// an unparsable "8x + 2y = 4" used to throw and nothing was drawn, while Masterji said it was there.
export function parseLine(raw: string): PlotLine[] {
  const s = asMath(raw.trim());
  const mk = (expr: string, label: string): PlotLine[] => {
    try {
      const c = compile(expr);
      const f = (x: number) => Number(c.evaluate({ x }));
      return [-2, 0, 1, 3].some((x) => Number.isFinite(f(x))) ? [{ f, label }] : [];
    } catch {
      return [];
    }
  };
  const sides = s.split("=").map((t) => t.trim());
  if (sides.length === 1) return mk(s, `y = ${raw.trim()}`);
  if (sides.length !== 2 || !sides[0] || !sides[1]) return [];
  const [L, R] = sides;
  const hasY = (t: string) => /\by\b|\dy\b|\*y\b/.test(t);
  if (/^y$/i.test(L) && !hasY(R)) return mk(R, raw.trim());
  if (/^y$/i.test(R) && !hasY(L)) return mk(L, raw.trim());
  if (hasY(L) || hasY(R)) {
    // Linear in y: g(x, y) = L - R = 0  ->  y = -g(x, 0) / (g(x, 1) - g(x, 0)).
    try {
      const g = compile(`(${L}) - (${R})`);
      const ev = (x: number, y: number) => Number(g.evaluate({ x, y }));
      const f = (x: number) => {
        const g0 = ev(x, 0),
          d = ev(x, 1) - g0;
        return Math.abs(d) < 1e-12 ? NaN : -g0 / d;
      };
      return Number.isFinite(f(0)) || Number.isFinite(f(1)) ? [{ f, label: raw.trim() }] : [];
    } catch {
      return [];
    }
  }
  return [...mk(L, `y = ${sides[0]}`), ...mk(R, `y = ${sides[1]}`)];
}

// Where the first two lines cross (or where a single line meets the x-axis), computed, not taken
// from the model: it once circled x = 3 for lines that really crossed at x = 1.
export function crossing(lines: PlotLine[], near = 0): number | undefined {
  if (!lines.length) return undefined;
  const h = lines.length >= 2 ? (x: number) => lines[0].f(x) - lines[1].f(x) : (x: number) => lines[0].f(x);
  const roots: number[] = [];
  const step = 0.05;
  let px = -30,
    pv = h(px);
  for (let x = px + step; x <= 30; x += step) {
    const v = h(x);
    if (Number.isFinite(v) && Number.isFinite(pv)) {
      if (v === 0) roots.push(x);
      else if (pv * v < 0) {
        let a = px,
          b = x;
        for (let i = 0; i < 40; i++) {
          const m = (a + b) / 2;
          if (h(a) * h(m) <= 0) b = m;
          else a = m;
        }
        roots.push((a + b) / 2);
      }
    }
    px = x;
    pv = v;
  }
  if (!roots.length) return undefined;
  const best = roots.sort((a, b) => Math.abs(a - near) - Math.abs(b - near))[0];
  return Math.abs(best - Math.round(best)) < 1e-6 ? Math.round(best) : +best.toFixed(2);
}

// Validates the model's lines and works out the true crossing. null if nothing can be plotted.
export function planGraph(exprs: string[], markX?: number): { lines: PlotLine[]; markX?: number } | null {
  const lines = exprs.flatMap(parseLine).slice(0, 3);
  if (!lines.length) return null;
  const x = lines.length >= 2 || markX !== undefined ? crossing(lines, markX ?? 0) : undefined;
  return { lines, markX: x };
}

function niceStep(range: number): number {
  const raw = range / 6;
  const p = 10 ** Math.floor(Math.log10(raw));
  return [1, 2, 5, 10].map((m) => m * p).find((s) => s >= raw) ?? 10 * p;
}

export function graph(spec: GraphSpec, box: { x: number; y: number; w: number; h: number }, seed?: number): PenItem {
  const r = rng(seed);
  const plan = planGraph(
    spec.lines.map((l) => l.expr),
    spec.markX,
  );
  if (!plan) throw new Error(`graph: nothing plottable in ${JSON.stringify(spec.lines)}`);
  const fns = plan.lines.map((l) => l.f);
  const labels = plan.lines.map((l) => l.label);
  spec = { ...spec, markX: plan.markX };
  const xMin = spec.xMin ?? Math.min(-1, (spec.markX ?? 0) - 4);
  const xMax = spec.xMax ?? Math.max(6, (spec.markX ?? 0) + 3);
  let yMin = 0,
    yMax = 0;
  for (const f of fns)
    for (let i = 0; i <= 40; i++) {
      const v = f(xMin + ((xMax - xMin) * i) / 40);
      if (Number.isFinite(v)) {
        yMin = Math.min(yMin, v);
        yMax = Math.max(yMax, v);
      }
    }
  const pad = (yMax - yMin) * 0.12 || 1;
  yMin -= pad;
  yMax += pad;
  const X = (x: number) => box.x + ((x - xMin) / (xMax - xMin)) * box.w;
  const Y = (y: number) => box.y + box.h - ((y - yMin) / (yMax - yMin)) * box.h;
  const j = (n: number) => (r() - 0.5) * n;

  const out: AnimatedStroke[] = [];
  let t = 0;
  const add = (points: Pt[], speed: number) => {
    const len = points.slice(1).reduce((s, p, i) => s + Math.hypot(p[0] - points[i][0], p[1] - points[i][1]), 0);
    const duration = Math.max(60, len / (speed * 2.2)); // ~2x the old pace: a graph in ~10 s, not 23
    out.push({ points, delay: t, duration });
    t += duration + 60;
  };
  const addItem = (item: PenItem) => {
    for (const s of item.strokes) out.push({ ...s, delay: s.delay + t });
    t += item.total + 40;
  };

  // axes (slightly wobbly, with arrow heads)
  const x0 = X(Math.max(xMin, Math.min(0, xMax))),
    y0 = Y(Math.max(yMin, Math.min(0, yMax)));
  add([[box.x - 10, y0 + j(2)], [box.x + box.w / 2, y0 + j(2)], [box.x + box.w + 14, y0 + j(2)]], 0.6);
  add([[box.x + box.w + 4, y0 - 7], [box.x + box.w + 14, y0], [box.x + box.w + 4, y0 + 7]], 0.4);
  add([[x0 + j(2), box.y + box.h + 10], [x0 + j(2), box.y + box.h / 2], [x0 + j(2), box.y - 14]], 0.6);
  add([[x0 - 7, box.y - 4], [x0, box.y - 14], [x0 + 7, box.y - 4]], 0.4);
  addItem(text("x", box.x + box.w + 18, y0 + 8, 18, Math.floor(r() * 1e6)).item);
  addItem(text("y", x0 + 10, box.y - 10, 18, Math.floor(r() * 1e6)).item);

  // ticks + numbers
  const xs = niceStep(xMax - xMin),
    ys = niceStep(yMax - yMin);
  for (let v = Math.ceil(xMin / xs) * xs; v <= xMax; v += xs) {
    if (Math.abs(v) < 1e-9) continue;
    add([[X(v), y0 - 5], [X(v), y0 + 5]], 0.5);
    addItem(text(String(+v.toFixed(2)), X(v) - 6, y0 + 26, 14, Math.floor(r() * 1e6)).item);
  }
  for (let v = Math.ceil(yMin / ys) * ys; v <= yMax; v += ys) {
    if (Math.abs(v) < 1e-9) continue;
    add([[x0 - 5, Y(v)], [x0 + 5, Y(v)]], 0.5);
    addItem(text(String(+v.toFixed(2)), x0 - 34, Y(v) + 5, 14, Math.floor(r() * 1e6)).item);
  }

  // the lines, each with its label at the right end
  fns.forEach((f, i) => {
    const pts: Pt[] = [];
    for (let k = 0; k <= 60; k++) {
      const x = xMin + ((xMax - xMin) * k) / 60;
      const v = f(x);
      if (Number.isFinite(v) && v >= yMin && v <= yMax) pts.push([X(x) + j(0.8), Y(v) + j(0.8)]);
    }
    if (pts.length > 1) add(pts, 0.35);
    const label = labels[i];
    const end = pts[pts.length - 1];
    if (end) addItem(text(label, Math.min(end[0] + 8, box.x + box.w - 60), end[1] - 12 - i * 4, 18, Math.floor(r() * 1e6)).item);
  });

  // the crossing: circle it, drop a dashed line to the x-axis, write "x = ..."
  if (spec.markX !== undefined && fns[0]) {
    const px = X(spec.markX),
      py = Y(fns[0](spec.markX));
    addItem(mark("circle", { x: px - 10, y: py - 10, w: 20, h: 20 }, Math.floor(r() * 1e6)));
    for (let yy = py + 14; yy < y0 - 6; yy += 16) add([[px, yy], [px, Math.min(yy + 8, y0 - 6)]], 0.5);
    addItem(text(`x = ${+spec.markX.toFixed(2)}`, px - 24, y0 + 62, 20, Math.floor(r() * 1e6)).item);
  }
  return { strokes: out, total: t };
}
