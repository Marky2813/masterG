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

const asMath = (e: string) => e.replace(/(\d)\s*([a-z(])/gi, "$1*$2").replace(/×/g, "*");

function niceStep(range: number): number {
  const raw = range / 6;
  const p = 10 ** Math.floor(Math.log10(raw));
  return [1, 2, 5, 10].map((m) => m * p).find((s) => s >= raw) ?? 10 * p;
}

export function graph(spec: GraphSpec, box: { x: number; y: number; w: number; h: number }, seed?: number): PenItem {
  const r = rng(seed);
  const fns = spec.lines.map((l) => {
    const c = compile(asMath(l.expr));
    return (x: number) => Number(c.evaluate({ x }));
  });
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
    const duration = Math.max(80, len / speed);
    out.push({ points, delay: t, duration });
    t += duration + 140;
  };
  const addItem = (item: PenItem) => {
    for (const s of item.strokes) out.push({ ...s, delay: s.delay + t });
    t += item.total + 100;
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
    const label = spec.lines[i].label ?? `y = ${spec.lines[i].expr}`;
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
