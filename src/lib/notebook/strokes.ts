import { getStroke } from "perfect-freehand";
import type { BBox, Point, Stroke } from "../types";

// A stroke on the notebook, with the bbox cached and a flag for the rough-work column.
export interface InkStroke extends Stroke {
  bbox: BBox;
  rough: boolean; // in the rough-work column: never clustered, never read, never marked
}

export const PEN_OPTIONS = { size: 5, thinning: 0.6, smoothing: 0.5, streamline: 0.4 } as const;

export function bboxOf(points: Point[]): BBox {
  let minX = Infinity,
    minY = Infinity,
    maxX = -Infinity,
    maxY = -Infinity;
  for (const p of points) {
    if (p.x < minX) minX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.x > maxX) maxX = p.x;
    if (p.y > maxY) maxY = p.y;
  }
  return { x: minX, y: minY, w: maxX - minX, h: maxY - minY };
}

export function unionBBox(boxes: BBox[]): BBox {
  const x = Math.min(...boxes.map((b) => b.x));
  const y = Math.min(...boxes.map((b) => b.y));
  const r = Math.max(...boxes.map((b) => b.x + b.w));
  const btm = Math.max(...boxes.map((b) => b.y + b.h));
  return { x, y, w: r - x, h: btm - y };
}

// Filled outline of a pressure-sensitive stroke, ready for ctx.fill().
export function strokePath(points: Point[], scale = 1, dx = 0, dy = 0): Path2D {
  const input = points.map((p) => [(p.x + dx) * scale, (p.y + dy) * scale, p.pressure]);
  const outline = getStroke(input, { ...PEN_OPTIONS, size: PEN_OPTIONS.size * scale, simulatePressure: false });
  const path = new Path2D();
  if (outline.length === 0) return path;
  path.moveTo(outline[0][0], outline[0][1]);
  for (const [x, y] of outline.slice(1)) path.lineTo(x, y);
  path.closePath();
  return path;
}

// Distance from point (px, py) to the segment a-b.
function distToSegment(px: number, py: number, a: Point, b: Point): number {
  const vx = b.x - a.x,
    vy = b.y - a.y;
  const len2 = vx * vx + vy * vy;
  const t = len2 === 0 ? 0 : Math.max(0, Math.min(1, ((px - a.x) * vx + (py - a.y) * vy) / len2));
  return Math.hypot(px - (a.x + t * vx), py - (a.y + t * vy));
}

// True if the eraser at (x, y) with this radius touches the stroke.
export function hitsStroke(s: InkStroke, x: number, y: number, radius: number): boolean {
  const b = s.bbox;
  if (x < b.x - radius || x > b.x + b.w + radius || y < b.y - radius || y > b.y + b.h + radius) return false;
  if (s.points.length === 1) return Math.hypot(x - s.points[0].x, y - s.points[0].y) <= radius;
  for (let i = 1; i < s.points.length; i++) {
    if (distToSegment(x, y, s.points[i - 1], s.points[i]) <= radius) return true;
  }
  return false;
}
