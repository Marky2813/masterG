"use client";

import { getStroke } from "perfect-freehand";
import { useCallback, useEffect, useRef, useState } from "react";
import { bus } from "@/lib/bus";
import { markPen } from "@/lib/notebook/penState";

// Rough work: a pull-out sheet that slides in from the right like a curtain. Its strokes are
// never read, never marked, never sent anywhere (PLAN.md §4 rough work). Cleared on a new question.
type Pt = [number, number, number];

function path(points: Pt[]): Path2D {
  const outline = getStroke(points, { size: 4.5, thinning: 0.6, smoothing: 0.5, streamline: 0.4, simulatePressure: false });
  const p = new Path2D();
  if (!outline.length) return p;
  p.moveTo(outline[0][0], outline[0][1]);
  for (const [x, y] of outline.slice(1)) p.lineTo(x, y);
  p.closePath();
  return p;
}

export default function RoughPad() {
  const [open, setOpen] = useState(false);
  const [eraser, setEraser] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const strokes = useRef<Pt[][]>([]);
  const current = useRef<Pt[] | null>(null);

  const redraw = useCallback(() => {
    const c = canvasRef.current;
    const ctx = c?.getContext("2d");
    if (!c || !ctx) return;
    const dpr = window.devicePixelRatio || 1;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, c.width, c.height);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = "#3b3b4f";
    for (const s of strokes.current) ctx.fill(path(s));
    if (current.current) ctx.fill(path(current.current));
  }, []);

  useEffect(() => {
    const c = canvasRef.current!;
    const ro = new ResizeObserver(() => {
      const dpr = window.devicePixelRatio || 1;
      c.width = Math.round(c.clientWidth * dpr);
      c.height = Math.round(c.clientHeight * dpr);
      redraw();
    });
    ro.observe(c);
    return () => ro.disconnect();
  }, [redraw]);

  // New question → fresh rough sheet.
  useEffect(
    () =>
      bus.on("questionConfirmed", () => {
        strokes.current = [];
        redraw();
      }),
    [redraw],
  );

  const pt = (e: React.PointerEvent<HTMLCanvasElement>): Pt => {
    const r = e.currentTarget.getBoundingClientRect();
    return [e.clientX - r.left, e.clientY - r.top, e.pointerType === "pen" ? Math.max(0.05, e.pressure) : 0.5];
  };
  const erasing = (e: React.PointerEvent) => eraser || (e.pointerType === "pen" && (e.buttons & 32) !== 0);
  const eraseAt = (x: number, y: number) => {
    const before = strokes.current.length;
    strokes.current = strokes.current.filter((s) => !s.some(([px, py]) => Math.hypot(px - x, py - y) < 14));
    if (strokes.current.length !== before) redraw();
  };

  const down = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    markPen(true);
    const p = pt(e);
    if (erasing(e)) {
      current.current = null;
      eraseAt(p[0], p[1]);
      return;
    }
    current.current = [p];
  };
  const move = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const p = pt(e);
    if (erasing(e) && e.buttons) return eraseAt(p[0], p[1]);
    if (!current.current) return;
    current.current.push(p);
    redraw();
  };
  const up = () => {
    markPen(false);
    if (current.current) strokes.current.push(current.current);
    current.current = null;
    redraw();
  };

  return (
    <>
      {/* the pull tab, always on the right edge; it rides on the sheet's edge when open */}
      <button
        onClick={() => setOpen((o) => !o)}
        className="fixed top-1/2 z-30 -translate-y-1/2 rounded-l-xl border border-r-0 border-amber-300 bg-amber-100 px-2 py-4 text-xs font-semibold tracking-widest text-amber-900 shadow-md transition-[right] duration-500 ease-in-out [writing-mode:vertical-rl]"
        style={{ right: open ? "min(46vw, 640px)" : "0px" }}
        title={open ? "Close rough work" : "Open rough work"}
      >
        {open ? "CLOSE ▸" : "◂ ROUGH"}
      </button>

      {/* the sheet: slides in right → left like a curtain, out left → right */}
      <div
        className="fixed inset-y-0 right-0 z-20 flex w-[min(46vw,640px)] flex-col border-l border-amber-300 shadow-[-12px_0_30px_-12px_rgba(0,0,0,0.25)] transition-transform duration-500 ease-in-out"
        style={{
          transform: open ? "translateX(0)" : "translateX(100%)",
          backgroundColor: "#fffbea",
          backgroundImage: "repeating-linear-gradient(to bottom, transparent 0, transparent 35px, #e9dcae 35px, #e9dcae 36px)",
        }}
        aria-hidden={!open}
      >
        <div className="flex items-center gap-2 border-b border-amber-200 bg-amber-50/90 px-4 py-2">
          <span className="text-sm font-semibold text-amber-900">Rough work</span>
          <span className="text-xs text-amber-700/70">Masterji won&apos;t check this page</span>
          <div className="ml-auto flex gap-1">
            <button className={`rounded px-2 py-1 text-xs ${!eraser ? "bg-amber-900 text-white" : "text-amber-900"}`} onClick={() => setEraser(false)}>
              ✏️
            </button>
            <button className={`rounded px-2 py-1 text-xs ${eraser ? "bg-amber-900 text-white" : "text-amber-900"}`} onClick={() => setEraser(true)}>
              🧽
            </button>
            <button
              className="rounded px-2 py-1 text-xs text-amber-900"
              onClick={() => {
                strokes.current = [];
                redraw();
              }}
            >
              Clear
            </button>
          </div>
        </div>
        <canvas
          ref={canvasRef}
          className="flex-1 touch-none"
          style={{ cursor: "crosshair", borderLeft: "2px solid #f3b4b4", marginLeft: 48, width: "calc(100% - 48px)" }}
          onPointerDown={down}
          onPointerMove={move}
          onPointerUp={up}
          onPointerCancel={up}
        />
      </div>
    </>
  );
}
