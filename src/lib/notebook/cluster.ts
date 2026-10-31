import type { BBox } from "../types";
import { unionBBox } from "./strokes";

// Groups strokes into clusters, one per written step. Pure and deterministic:
// the whole notebook is re-clustered on every pen pause, so erasing or adding a
// stroke anywhere just produces the new grouping. PLAN.md §4.
//
// Two strokes join the same cluster when either:
//   - spatial: their bboxes are within hGap horizontally AND vGap vertically
//     (same line, or a stacked fraction's numerator / bar / denominator), or
//   - temporal: they were written one right after the other (< tGapMs apart)
//     and are within jumpGap of each other. This keeps a stacked fraction
//     together without letting the next line merge in: starting a new line is a
//     big jump back to the left.
// Thresholds are in notebook units (the canvas is 1200 units wide).

export interface ClusterInput {
  id: string;
  bbox: BBox;
  t0: number; // first point time (ms)
  t1: number; // last point time (ms)
}

export interface ClusterOpts {
  hGap: number;
  vGap: number;
  tGapMs: number;
  jumpGap: number;
}

export const DEFAULT_CLUSTER_OPTS: ClusterOpts = { hGap: 70, vGap: 12, tGapMs: 1200, jumpGap: 45 };

export interface ClusterGroup {
  strokeIds: string[];
  bbox: BBox;
}

function gap(a: BBox, b: BBox): { gx: number; gy: number } {
  const gx = Math.max(0, Math.max(a.x, b.x) - Math.min(a.x + a.w, b.x + b.w));
  const gy = Math.max(0, Math.max(a.y, b.y) - Math.min(a.y + a.h, b.y + b.h));
  return { gx, gy };
}

export function clusterStrokes(strokes: ClusterInput[], opts: ClusterOpts = DEFAULT_CLUSTER_OPTS): ClusterGroup[] {
  const parent = strokes.map((_, i) => i);
  const find = (i: number): number => (parent[i] === i ? i : (parent[i] = find(parent[i])));
  const union = (i: number, j: number) => {
    const a = find(i),
      b = find(j);
    if (a !== b) parent[b] = a;
  };

  for (let i = 0; i < strokes.length; i++) {
    for (let j = i + 1; j < strokes.length; j++) {
      const { gx, gy } = gap(strokes[i].bbox, strokes[j].bbox);
      if (gx <= opts.hGap && gy <= opts.vGap) union(i, j);
    }
  }

  const byTime = strokes.map((s, i) => i).sort((a, b) => strokes[a].t0 - strokes[b].t0);
  for (let k = 1; k < byTime.length; k++) {
    const a = strokes[byTime[k - 1]],
      b = strokes[byTime[k]];
    if (b.t0 - a.t1 > opts.tGapMs) continue;
    const { gx, gy } = gap(a.bbox, b.bbox);
    if (Math.hypot(gx, gy) <= opts.jumpGap) union(byTime[k - 1], byTime[k]);
  }

  const groups = new Map<number, number[]>();
  strokes.forEach((_, i) => {
    const r = find(i);
    if (!groups.has(r)) groups.set(r, []);
    groups.get(r)!.push(i);
  });

  return [...groups.values()]
    .map((idx) => ({
      strokeIds: idx.map((i) => strokes[i].id).sort(),
      bbox: unionBBox(idx.map((i) => strokes[i].bbox)),
    }))
    .sort((a, b) => a.bbox.y - b.bbox.y || a.bbox.x - b.bbox.x); // reading order: top to bottom
}

// Keeps cluster ids stable across re-clustering: a new group takes the id of the
// previous cluster it shares the most strokes with (each old id used once).
export function assignIds(
  groups: ClusterGroup[],
  previous: Map<string, string[]>,
  nextId: () => string,
): Map<string, ClusterGroup> {
  const claimed = new Set<string>();
  const out = new Map<string, ClusterGroup>();
  const scored = groups.map((g) => {
    const set = new Set(g.strokeIds);
    let best: string | null = null,
      bestN = 0;
    for (const [id, ids] of previous) {
      const n = ids.filter((s) => set.has(s)).length;
      if (n > bestN) {
        best = id;
        bestN = n;
      }
    }
    return { g, best, bestN };
  });
  scored.sort((a, b) => b.bestN - a.bestN); // strongest matches claim their id first
  for (const { g, best } of scored) {
    const id = best && !claimed.has(best) ? best : nextId();
    claimed.add(id);
    out.set(id, g);
  }
  return out;
}
