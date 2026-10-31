"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { bus } from "@/lib/bus";
import type { Point } from "@/lib/types";
import { mark as penMark, text as penText } from "@/lib/redpen";
import { drawPenItems, type PlacedItem } from "@/lib/redpen/draw";
import { markPen } from "@/lib/notebook/penState";
import { assignIds, clusterStrokes, type ClusterGroup } from "@/lib/notebook/cluster";
import { cropCluster } from "@/lib/notebook/crop";
import { bboxOf, hitsStroke, strokePath, type InkStroke } from "@/lib/notebook/strokes";

// The kid's notebook: free-flow pen writing with pressure, an eraser, a ruled
// page and a rough-work column. On every ~1.5 s pen pause it re-clusters the
// main area and emits clusterUpdated / clusterRemoved on the bus. PLAN.md §4.

export const PAGE_W = 1600; // notebook units (landscape whiteboard); the canvas scales to the screen
export const PAGE_H = 1000;
export const ROUGH_X = PAGE_W * 0.8; // rough-work column starts here
export const GRID = 40; // grid cell, in notebook units
const PAUSE_MS = 1500;
const ERASER_RADIUS = 14;

type Tool = "pen" | "eraser";

export interface NotebookCluster extends ClusterGroup {
  id: string;
}

export default function Notebook({ debug = false, toolbarExtra }: { debug?: boolean; toolbarExtra?: ReactNode }) {
  const inkRef = useRef<HTMLCanvasElement>(null);
  const overlayRef = useRef<HTMLCanvasElement>(null);
  const strokesRef = useRef<InkStroke[]>([]);
  const currentRef = useRef<InkStroke | null>(null);
  const erasingRef = useRef(false);
  const pauseTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const clustersRef = useRef<Map<string, NotebookCluster>>(new Map());
  const signaturesRef = useRef<Map<string, string>>(new Map());
  const idCounter = useRef(0);
  const strokeCounter = useRef(0);
  // Red-pen ink per cluster: the verdict mark plus any margin notes. Erasing the cluster removes it.
  const penRef = useRef<Map<string, { mark?: PlacedItem; notes: PlacedItem[] }>>(new Map());
  const animUntilRef = useRef(0);
  const linesRef = useRef<{ item: PlacedItem; bottom: number }[]>([]); // Masterji's full lines of working (write_line) // keep redrawing the overlay until the last pen stroke is done

  const [tool, setTool] = useState<Tool>("pen");
  const [clusters, setClusters] = useState<NotebookCluster[]>([]);

  // ---------- drawing ----------
  const redraw = useCallback(() => {
    const canvas = inkRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const s = canvas.width / PAGE_W;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.setTransform(s, 0, 0, s, 0, 0);
    ctx.fillStyle = "#1e293b";
    for (const st of strokesRef.current) ctx.fill(strokePath(st.points));
    if (currentRef.current) ctx.fill(strokePath(currentRef.current.points));
  }, []);

  const drawOverlay = useCallback(
    (list: NotebookCluster[]) => {
      const canvas = overlayRef.current;
      const ctx = canvas?.getContext("2d");
      if (!canvas || !ctx) return;
      const s = canvas.width / PAGE_W;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.setTransform(s, 0, 0, s, 0, 0);
      // Masterji's red pen (animated).
      const placed: PlacedItem[] = [];
      for (const ink of penRef.current.values()) {
        if (ink.mark) placed.push(ink.mark);
        placed.push(...ink.notes);
      }
      placed.push(...linesRef.current.map((l) => l.item));
      drawPenItems(ctx, placed, performance.now());
      if (!debug) return;
      ctx.strokeStyle = "rgba(37, 99, 235, 0.6)";
      ctx.fillStyle = "rgba(37, 99, 235, 0.9)";
      ctx.lineWidth = 1.5;
      ctx.font = "14px monospace";
      for (const c of list) {
        const b = c.bbox;
        ctx.strokeRect(b.x - 6, b.y - 6, b.w + 12, b.h + 12);
        ctx.fillText(c.id, b.x - 6, b.y - 10);
      }
    },
    [debug],
  );

  // Animation loop: only redraws while red ink is being written (a number compare per frame when idle).
  useEffect(() => {
    let id = 0;
    const loop = () => {
      if (performance.now() < animUntilRef.current + 50) drawOverlay([...clustersRef.current.values()]);
      id = requestAnimationFrame(loop);
    };
    id = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(id);
  }, [drawOverlay]);

  // Match the canvas backing store to its on-screen size (crisp on HiDPI).
  useEffect(() => {
    const ink = inkRef.current!;
    const ro = new ResizeObserver(() => {
      const dpr = window.devicePixelRatio || 1;
      const w = Math.round(ink.clientWidth * dpr);
      const h = Math.round((w * PAGE_H) / PAGE_W);
      for (const c of [inkRef.current, overlayRef.current]) {
        if (c && (c.width !== w || c.height !== h)) {
          c.width = w;
          c.height = h;
        }
      }
      redraw();
      drawOverlay([...clustersRef.current.values()]);
    });
    ro.observe(ink);
    return () => ro.disconnect();
  }, [redraw, drawOverlay]);

  // ---------- clustering on pen pause ----------
  const recluster = useCallback(() => {
    const main = strokesRef.current.filter((s) => !s.rough);
    const groups = clusterStrokes(
      main.map((s) => ({ id: s.id, bbox: s.bbox, t0: s.points[0].t, t1: s.points[s.points.length - 1].t })),
    );
    const prev = new Map([...clustersRef.current].map(([id, c]) => [id, c.strokeIds]));
    const next = assignIds(groups, prev, () => `c${++idCounter.current}`);

    const byId = new Map(main.map((s) => [s.id, s]));
    const nextClusters = new Map<string, NotebookCluster>();
    for (const [id, g] of next) nextClusters.set(id, { id, ...g });

    // Removed clusters.
    for (const id of clustersRef.current.keys()) {
      if (!nextClusters.has(id)) {
        signaturesRef.current.delete(id);
        penRef.current.delete(id);
        bus.emit("clusterRemoved", { id });
      }
    }
    // New or changed clusters.
    for (const c of nextClusters.values()) {
      const sig = c.strokeIds.join(",");
      if (signaturesRef.current.get(c.id) === sig) continue;
      signaturesRef.current.set(c.id, sig);
      penRef.current.delete(c.id); // erase/overwrite: that cluster's marks and notes vanish until it's re-checked
      const imagePng = cropCluster(
        c.strokeIds.map((id) => byId.get(id)!),
        c.bbox,
      );
      bus.emit("clusterUpdated", { id: c.id, bbox: c.bbox, imagePng, strokeIds: c.strokeIds });
    }

    clustersRef.current = nextClusters;
    const list = [...nextClusters.values()];
    setClusters(list);
    drawOverlay(list);
  }, [drawOverlay]);

  const schedulePause = useCallback(() => {
    if (pauseTimer.current) clearTimeout(pauseTimer.current);
    pauseTimer.current = setTimeout(recluster, PAUSE_MS);
  }, [recluster]);

  const cancelPause = () => {
    if (pauseTimer.current) clearTimeout(pauseTimer.current);
    pauseTimer.current = null;
  };

  useEffect(() => () => cancelPause(), []);

  // Verdicts from the Brain → a red-pen mark on the cluster's bbox (placed by code, PLAN.md §4).
  // writeNote from Voice → a handwritten margin note beside the cluster, never in rough work.
  useEffect(() => {
    const offVerdict = bus.on("verdict", (v) => {
      const c = clustersRef.current.get(v.clusterId);
      if (!c) return;
      const ink = penRef.current.get(v.clusterId) ?? { notes: [] };
      ink.mark = v.mark === "none" ? undefined : { item: penMark(v.mark, c.bbox), start: performance.now() };
      if (ink.mark) animUntilRef.current = Math.max(animUntilRef.current, ink.mark.start + ink.mark.item.total);
      penRef.current.set(v.clusterId, ink);
      drawOverlay([...clustersRef.current.values()]);
    });
    const offNote = bus.on("writeNote", ({ clusterId, text }) => {
      const c = clustersRef.current.get(clusterId);
      if (!c) return;
      const ink = penRef.current.get(clusterId) ?? { notes: [] };
      const size = 26;
      // Right of the step (after the tick/cross), else below it if there's no room before the rough-work column.
      let x = c.bbox.x + c.bbox.w + 80;
      let y = c.bbox.y + c.bbox.h / 2 + size / 2 + ink.notes.length * (size + 12);
      const { width } = penText(text, 0, 0, size, 1);
      if (x + width > ROUGH_X - 16) {
        x = c.bbox.x;
        y = c.bbox.y + c.bbox.h + size + 18 + ink.notes.length * (size + 12);
      }
      const note = { item: penText(text, x, y, size).item, start: performance.now() };
      ink.notes.push(note);
      animUntilRef.current = Math.max(animUntilRef.current, note.start + note.item.total);
      penRef.current.set(clusterId, ink);
      drawOverlay([...clustersRef.current.values()]);
    });
    // writeLine from Voice → a full handwritten line of working under everything on the page.
    const offLine = bus.on("writeLine", ({ text }) => {
      const size = 30;
      const bottoms = [...clustersRef.current.values()].map((c) => c.bbox.y + c.bbox.h).concat(linesRef.current.map((l) => l.bottom));
      const y = Math.min(PAGE_H - 40, Math.max(140, ...bottoms) + size + 40);
      const item = { item: penText(text, 120, y, size).item, start: performance.now() };
      linesRef.current.push({ item, bottom: y + 12 });
      animUntilRef.current = Math.max(animUntilRef.current, item.start + item.item.total);
      drawOverlay([...clustersRef.current.values()]);
    });
    return () => {
      offVerdict();
      offNote();
      offLine();
    };
  }, [drawOverlay]);

  // ---------- pointer input ----------
  const toPoint = (e: React.PointerEvent<HTMLCanvasElement>): Point => {
    const rect = e.currentTarget.getBoundingClientRect();
    return {
      x: ((e.clientX - rect.left) / rect.width) * PAGE_W,
      y: ((e.clientY - rect.top) / rect.height) * PAGE_H,
      pressure: e.pointerType === "pen" ? Math.max(0.05, e.pressure) : 0.5,
      t: performance.now(),
    };
  };

  // Stylus eraser end (buttons bit 32) or the eraser tool.
  const isEraser = (e: React.PointerEvent) => tool === "eraser" || (e.pointerType === "pen" && (e.buttons & 32) !== 0);

  const eraseAt = (p: Point) => {
    const before = strokesRef.current.length;
    strokesRef.current = strokesRef.current.filter((s) => !hitsStroke(s, p.x, p.y, ERASER_RADIUS));
    if (strokesRef.current.length !== before) redraw();
  };

  const onDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    markPen(true);
    cancelPause();
    const p = toPoint(e);
    if (isEraser(e)) {
      erasingRef.current = true;
      eraseAt(p);
      return;
    }
    currentRef.current = { id: `s${++strokeCounter.current}`, points: [p], bbox: bboxOf([p]), rough: false };
    redraw();
  };

  const onMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (erasingRef.current) {
      eraseAt(toPoint(e));
      return;
    }
    const cur = currentRef.current;
    if (!cur) return;
    // Coalesced events give the full pen resolution between frames.
    const events = e.nativeEvent.getCoalescedEvents?.() ?? [];
    if (events.length > 0) {
      const rect = e.currentTarget.getBoundingClientRect();
      for (const ce of events) {
        cur.points.push({
          x: ((ce.clientX - rect.left) / rect.width) * PAGE_W,
          y: ((ce.clientY - rect.top) / rect.height) * PAGE_H,
          pressure: ce.pointerType === "pen" ? Math.max(0.05, ce.pressure) : 0.5,
          t: performance.now(),
        });
      }
    } else {
      cur.points.push(toPoint(e));
    }
    redraw();
  };

  const onUp = () => {
    markPen(false);
    if (erasingRef.current) {
      erasingRef.current = false;
      schedulePause();
      return;
    }
    const cur = currentRef.current;
    if (!cur) return;
    currentRef.current = null;
    cur.bbox = bboxOf(cur.points);
    cur.rough = cur.bbox.x + cur.bbox.w / 2 >= ROUGH_X;
    strokesRef.current.push(cur);
    redraw();
    schedulePause();
  };

  const undo = () => {
    strokesRef.current.pop();
    redraw();
    schedulePause();
  };

  const clearAll = () => {
    strokesRef.current = [];
    penRef.current.clear();
    linesRef.current = [];
    redraw();
    cancelPause();
    recluster();
  };

  // Pen cursor dot (PLAN.md §3: the pen cursor dot is visible on the canvas).
  const cursor =
    tool === "eraser"
      ? "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='24' height='24'><circle cx='12' cy='12' r='10' fill='none' stroke='%23475569' stroke-width='1.5'/></svg>\") 12 12, cell"
      : "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='8' height='8'><circle cx='4' cy='4' r='3' fill='%231e293b'/></svg>\") 4 4, crosshair";

  const btn = (active: boolean) =>
    `flex h-9 min-w-9 items-center justify-center rounded-lg px-2 text-sm transition ${active ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-100"}`;

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-white">
      <div
        className="relative max-h-full max-w-full"
        style={{
          width: `min(100vw, ${(100 * PAGE_W) / PAGE_H}vh)`,
          aspectRatio: `${PAGE_W} / ${PAGE_H}`,
          backgroundColor: "#fdfdfc",
          backgroundImage:
            "linear-gradient(to right, #e7ebf0 1px, transparent 1px), linear-gradient(to bottom, #e7ebf0 1px, transparent 1px)",
          backgroundSize: `${(100 * GRID) / PAGE_W}% ${(100 * GRID) / PAGE_H}%`,
        }}
      >
        {/* rough-work column: subtle, never read or marked */}
        <div
          className="pointer-events-none absolute inset-y-0 right-0 border-l border-dashed border-slate-300"
          style={{ left: `${(ROUGH_X / PAGE_W) * 100}%` }}
        >
          <div className="absolute bottom-3 w-full text-center text-[11px] font-medium uppercase tracking-widest text-slate-300">
            Rough work
          </div>
        </div>
        <canvas
          ref={inkRef}
          className="absolute inset-0 h-full w-full touch-none"
          style={{ cursor }}
          onPointerDown={onDown}
          onPointerMove={onMove}
          onPointerUp={onUp}
          onPointerCancel={onUp}
          onContextMenu={(e) => e.preventDefault()}
        />
        <canvas ref={overlayRef} className="pointer-events-none absolute inset-0 h-full w-full" />
      </div>

      {/* floating toolbar, top right */}
      <div className="fixed right-4 top-4 flex items-center gap-1 rounded-xl border border-slate-200 bg-white/95 p-1 shadow-sm backdrop-blur">
        <button className={btn(tool === "pen")} onClick={() => setTool("pen")} title="Pen">
          ✏️
        </button>
        <button className={btn(tool === "eraser")} onClick={() => setTool("eraser")} title="Eraser">
          🧽
        </button>
        <button className={btn(false)} onClick={undo} title="Undo">
          ↶
        </button>
        <button className={btn(false)} onClick={clearAll} title="Clear page">
          Clear
        </button>
        {toolbarExtra}
        {debug && <span className="px-2 font-mono text-xs text-slate-400">{clusters.length} clusters</span>}
      </div>
    </div>
  );
}

