// Red-pen engine: procedurally generated "handwritten" marks and notes for
// Masterji. Pure functions: (what, where, seed) → strokes with timing. The
// notebook animates them. Every call is slightly different, like a real pen.
// PLAN.md §4 "AI handwriting".
import type { BBox, MarkType } from "../types";
import { GLYPHS, LETTER_GAP, SPACE_W } from "./font";

export type Pt = [number, number];

export interface AnimatedStroke {
  points: Pt[];
  delay: number; // ms after the item starts
  duration: number; // ms to draw this stroke
}

export interface PenItem {
  strokes: AnimatedStroke[];
  total: number; // ms until the last stroke is finished
}

// ---------- randomness ----------
export function rng(seed = Math.floor(Math.random() * 2 ** 31)): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const between = (r: () => number, lo: number, hi: number) => lo + (hi - lo) * r();

// ---------- geometry helpers ----------
const lengthOf = (pts: Pt[]) => pts.slice(1).reduce((s, p, i) => s + Math.hypot(p[0] - pts[i][0], p[1] - pts[i][1]), 0);

// Catmull-Rom through the control points: turns polylines into smooth pen paths.
function smooth(pts: Pt[], perSeg = 6): Pt[] {
  if (pts.length < 3) return pts;
  const out: Pt[] = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)],
      p1 = pts[i],
      p2 = pts[i + 1],
      p3 = pts[Math.min(pts.length - 1, i + 2)];
    for (let k = 0; k < perSeg; k++) {
      const t = k / perSeg,
        t2 = t * t,
        t3 = t2 * t;
      out.push([
        0.5 * (2 * p1[0] + (-p0[0] + p2[0]) * t + (2 * p0[0] - 5 * p1[0] + 4 * p2[0] - p3[0]) * t2 + (-p0[0] + 3 * p1[0] - 3 * p2[0] + p3[0]) * t3),
        0.5 * (2 * p1[1] + (-p0[1] + p2[1]) * t + (2 * p0[1] - 5 * p1[1] + 4 * p2[1] - p3[1]) * t2 + (-p0[1] + 3 * p1[1] - 3 * p2[1] + p3[1]) * t3),
      ]);
    }
  }
  out.push(pts[pts.length - 1]);
  return out;
}

// Turns stroke geometry into a timed sequence: pen speed in px/ms, a short lift between strokes.
function timed(strokes: Pt[][], speed: number, r: () => number, start = 0): PenItem {
  let t = start;
  const out: AnimatedStroke[] = [];
  for (const points of strokes) {
    const duration = Math.max(60, lengthOf(points) / speed);
    out.push({ points, delay: t, duration });
    t += duration + between(r, 50, 110);
  }
  return { strokes: out, total: t };
}

// ---------- marks ----------
export function mark(type: MarkType, b: BBox, seed?: number): PenItem {
  const r = rng(seed);
  const j = (n: number) => between(r, -n, n);
  const size = Math.max(26, Math.min(56, b.h * 0.9));
  const right = b.x + b.w + 22;
  const midY = b.y + b.h / 2;

  switch (type) {
    case "tick": {
      const x = right + j(4),
        y = midY + j(3);
      const s = size * between(r, 0.85, 1.1);
      const pts: Pt[] = [
        [x, y - s * 0.05],
        [x + s * 0.18 + j(2), y + s * 0.2],
        [x + s * 0.3, y + s * 0.38 + j(2)],
        [x + s * 0.55 + j(2), y - s * 0.05],
        [x + s * 0.95 + j(3), y - s * 0.55 + j(3)],
      ];
      return timed([smooth(pts, 5)], 0.9, r);
    }
    case "cross": {
      const x = right + j(4),
        y = midY - size * 0.4;
      const s = size * 0.8;
      return timed(
        [
          smooth([[x, y + j(2)], [x + s * 0.5 + j(2), y + s * 0.5], [x + s + j(2), y + s + j(2)]], 4),
          smooth([[x + s + j(2), y + j(2)], [x + s * 0.5 + j(2), y + s * 0.5], [x + j(2), y + s + j(2)]], 4),
        ],
        0.8,
        r,
      );
    }
    case "circle": {
      // An ellipse that doesn't quite close and overshoots, with low-frequency wobble.
      const cx = b.x + b.w / 2,
        cy = b.y + b.h / 2;
      const rx = b.w / 2 + 18,
        ry = b.h / 2 + 14;
      const tilt = j(0.06);
      const start = between(r, -2.6, -2.0);
      const sweep = Math.PI * 2 + between(r, 0.25, 0.5);
      const w1 = between(r, 0, Math.PI * 2),
        w2 = between(r, 0, Math.PI * 2);
      const n = 48;
      const pts: Pt[] = [];
      for (let i = 0; i <= n; i++) {
        const a = start + (sweep * i) / n;
        const grow = 1 + 0.06 * (i / n); // second lap drifts outward a little
        const wob = 1 + 0.035 * Math.sin(a * 2 + w1) + 0.02 * Math.sin(a * 3 + w2);
        const ex = rx * grow * wob * Math.cos(a),
          ey = ry * grow * wob * Math.sin(a);
        pts.push([cx + ex * Math.cos(tilt) - ey * Math.sin(tilt), cy + ex * Math.sin(tilt) + ey * Math.cos(tilt)]);
      }
      return timed([pts], 1.6, r);
    }
    case "underline": {
      const y = b.y + b.h + 10;
      const n = 10;
      const phase = between(r, 0, Math.PI * 2);
      const pts: Pt[] = [];
      for (let i = 0; i <= n; i++) pts.push([b.x - 4 + ((b.w + 8) * i) / n, y + 2.5 * Math.sin(phase + i * 0.9) + j(1)]);
      return timed([smooth(pts, 3)], 1.3, r);
    }
    case "arrow": {
      // From below-left, pointing at the start of the step.
      const tip: Pt = [b.x - 10, midY];
      const tail: Pt = [tip[0] - 60 + j(6), tip[1] + 50 + j(6)];
      const mid: Pt = [(tip[0] + tail[0]) / 2 + j(6), (tip[1] + tail[1]) / 2 + j(6)];
      const ang = Math.atan2(tip[1] - mid[1], tip[0] - mid[0]);
      const head = (d: number): Pt => [tip[0] - 14 * Math.cos(ang + d), tip[1] - 14 * Math.sin(ang + d)];
      return timed([smooth([tail, mid, tip], 6), [head(0.5), tip, head(-0.5)]], 1.0, r);
    }
    default:
      return { strokes: [], total: 0 };
  }
}

// ---------- notes ----------
export interface TextLayout {
  item: PenItem;
  width: number;
}

// Handwritten text with its baseline-left corner at (x, y). `size` is the cap height in px.
export function text(str: string, x: number, y: number, size = 26, seed?: number): TextLayout {
  const r = rng(seed);
  const u = size / 10;
  const slant = between(r, 0.12, 0.2); // forward lean
  const drift = between(r, -0.02, 0.02); // baseline not quite straight
  const strokes: Pt[][] = [];
  let pen = 0;
  for (const ch of str) {
    if (ch === " ") {
      pen += SPACE_W;
      continue;
    }
    const g = GLYPHS[ch] ?? GLYPHS[ch.toLowerCase()] ?? GLYPHS[ch.toUpperCase()];
    if (!g) {
      pen += SPACE_W;
      continue;
    }
    const scale = between(r, 0.94, 1.06);
    const lift = between(r, -0.3, 0.3);
    for (const poly of g.s) {
      const pts = poly.map(([gx, gy]): Pt => {
        const px = pen + gx * scale + between(r, -0.18, 0.18);
        const py = (gy - 10) * scale + lift + between(r, -0.18, 0.18); // 0 = baseline
        return [x + (px - py * slant) * u, y + (py + px * drift) * u];
      });
      strokes.push(smooth(pts, 4));
    }
    pen += g.w * scale + LETTER_GAP;
  }
  return { item: timed(strokes, 0.45, r), width: pen * u };
}

// How much of an item to draw at time t: each stroke's points up to its progress.
export function visibleAt(item: PenItem, t: number): Pt[][] {
  const out: Pt[][] = [];
  for (const s of item.strokes) {
    if (t <= s.delay) break;
    const f = Math.min(1, (t - s.delay) / s.duration);
    const n = Math.max(2, Math.ceil(s.points.length * f));
    out.push(s.points.slice(0, n));
  }
  return out;
}
