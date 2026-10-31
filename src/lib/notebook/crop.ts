import type { BBox } from "../types";
import { strokePath, type InkStroke } from "./strokes";

// Renders one cluster as a PNG for Flash: dark ink on white, padded, like the
// benchmark samples from /capture, so we ship what we benchmarked.
const PAD = 24;
const MAX_W = 1000;
const MAX_H = 400;

export function cropCluster(strokes: InkStroke[], bbox: BBox): string {
  const w = bbox.w + PAD * 2,
    h = bbox.h + PAD * 2;
  const scale = Math.min(1, MAX_W / w, MAX_H / h) * 1; // never upscale beyond notebook units
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(w * scale));
  canvas.height = Math.max(1, Math.round(h * scale));
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#1e293b";
  for (const s of strokes) ctx.fill(strokePath(s.points, scale, PAD - bbox.x, PAD - bbox.y));
  return canvas.toDataURL("image/png");
}
