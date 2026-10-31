import { visibleAt, type PenItem } from "./index";

export const RED_INK = "#d42a2a";

export interface PlacedItem {
  item: PenItem;
  start: number; // performance.now() when it began drawing
}

// Draws every item as far as it has got by `now`. Returns true while anything is still being written.
export function drawPenItems(ctx: CanvasRenderingContext2D, items: PlacedItem[], now: number): boolean {
  let busy = false;
  ctx.strokeStyle = RED_INK;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  for (const { item, start } of items) {
    const t = now - start;
    if (t < item.total) busy = true;
    for (const pts of visibleAt(item, t)) {
      if (pts.length < 2) continue;
      // Ballpoint feel: a touch thinner at the start and end of each stroke.
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(pts[0][0], pts[0][1]);
      for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
      ctx.stroke();
    }
  }
  return busy;
}
