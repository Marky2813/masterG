"use client";

import { useEffect, useRef } from "react";
import { mark, text } from "@/lib/redpen";
import { drawPenItems, type PlacedItem } from "@/lib/redpen/draw";
import { graph } from "@/lib/redpen/graph";
import type { MarkType } from "@/lib/types";

// Preview of the red-pen engine: every mark and a few notes, redrawn with a new
// random seed each time you click. Dev tool for tuning the look (#16).
const MARKS: MarkType[] = ["tick", "cross", "circle", "underline", "arrow"];
const NOTES = ["LCM?", "carry 1", "9/12", "Dhyan se!", "sign badlo", "= 11/12", "HCF(12, 18) = 6", "Shabash!"];

export default function RedPenPreview() {
  const ref = useRef<HTMLCanvasElement>(null);

  const play = () => {
    const canvas = ref.current!;
    const ctx = canvas.getContext("2d")!;
    const now = performance.now();
    const items: PlacedItem[] = [];
    MARKS.forEach((m, i) => {
      const box = { x: 60 + i * 230, y: 90, w: 120, h: 50 };
      items.push({ item: mark(m, box), start: now + i * 250 });
    });
    NOTES.forEach((n, i) => {
      items.push({ item: text(n, 60 + (i % 4) * 290, 260 + Math.floor(i / 4) * 80, 28).item, start: now + 1200 + i * 300 });
    });
    items.push({ item: graph({ lines: [{ expr: "3x + 5", label: "y = 3x + 5" }, { expr: "20", label: "y = 20" }], markX: 5 }, { x: 120, y: 470, w: 640, h: 360 }), start: now + 300 });
    const frame = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = "#94a3b8";
      ctx.font = "14px monospace";
      MARKS.forEach((m, i) => {
        ctx.strokeStyle = "#cbd5e1";
        ctx.strokeRect(60 + i * 230, 90, 120, 50);
        ctx.fillText(m, 60 + i * 230, 80);
      });
      if (drawPenItems(ctx, items, performance.now())) requestAnimationFrame(frame);
    };
    frame();
  };

  useEffect(play, []);

  return (
    <main className="space-y-3 p-6">
      <h1 className="text-xl font-semibold">Red-pen engine preview</h1>
      <button className="rounded bg-slate-800 px-3 py-1 text-white" onClick={play}>
        Redraw (new randomness)
      </button>
      <canvas ref={ref} width={1250} height={960} className="rounded border border-slate-300 bg-white" />
    </main>
  );
}
