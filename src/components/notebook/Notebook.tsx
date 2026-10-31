"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { bus } from "@/lib/bus";
import type { Point } from "@/lib/types";
import { mark as penMark, text as penText } from "@/lib/redpen";
import { drawPenItems, type PlacedItem } from "@/lib/redpen/draw";
import { graph as penGraph } from "@/lib/redpen/graph";
import { markPen } from "@/lib/notebook/penState";
import { assignIds, clusterStrokes, type ClusterGroup } from "@/lib/notebook/cluster";
import { cropCluster } from "@/lib/notebook/crop";
import { bboxOf, hitsStroke, strokePath, type InkStroke } from "@/lib/notebook/strokes";

// The kid's notebook: free-flow pen writing with pressure, an eraser, a ruled
// page and a rough-work column. On every ~1.5 s pen pause it re-clusters the
// main area and emits clusterUpdated / clusterRemoved on the bus. PLAN.md §4.

export const PAGE_W = 1600; // notebook units (landscape whiteboard); the canvas scales to the screen
export const SCREEN_H = 1000; // one screen-sized page, in notebook units; the board grows page by page
// Canvas backing stores are capped well under browser limits (a 3-screen page at DPR 2 on a big
// display threw "InvalidStateError: canvas exceeds max size").
const MAX_CANVAS_PX = 16_000_000;
const MAX_CANVAS_DIM = 16_000;
// Rough work lives on its own pull-out sheet (RoughPad), so the whole board is the main area.
// ROUGH_X is now just the right margin that notes never cross.
export const ROUGH_X = PAGE_W - 40;
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
  const linesRef = useRef<{ item: PlacedItem; bottom: number }[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  // Earlier questions stay on the board above, read-only: never re-clustered or re-checked.
  const archivedRef = useRef<InkStroke[]>([]);
  const archivedInkRef = useRef<PlacedItem[]>([]);
  const questionTopRef = useRef(0); // where the current question's page starts (units)
  const [pages, setPages] = useState(1);
  const pageHRef = useRef(SCREEN_H);

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
    for (const st of archivedRef.current) ctx.fill(strokePath(st.points));
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
      const placed: PlacedItem[] = [...archivedInkRef.current];
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
      const cssW = ink.clientWidth,
        cssH = (cssW * pageHRef.current) / PAGE_W;
      const scale = Math.min(dpr, Math.sqrt(MAX_CANVAS_PX / Math.max(1, cssW * cssH)), MAX_CANVAS_DIM / Math.max(1, cssH), MAX_CANVAS_DIM / Math.max(1, cssW));
      const w = Math.round(cssW * scale);
      const h = Math.round(cssH * scale);
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

  // ---------- keeping red ink in view ----------
  // Floating panels (Masterji's card + question chip, toolbar, talk button) sit over the board. They
  // are sized in CSS px, so at 120% browser zoom they cover more of it: red ink placed by fixed
  // board units landed behind the card. Measure them live instead.
  const unitPx = () => (inkRef.current?.clientWidth || PAGE_W) / PAGE_W;
  const safeBand = () => {
    let top = 0,
      bottom = window.innerHeight;
    document.querySelectorAll<HTMLElement>("[data-overlay]").forEach((el) => {
      const r = el.getBoundingClientRect();
      if (el.dataset.overlay === "top") top = Math.max(top, r.bottom);
      else bottom = Math.min(bottom, r.top);
    });
    return { top: top + 16, bottom: bottom - 16 };
  };
  // Scroll just enough that Masterji's new ink (board units y0..y1) is visible between the panels.
  // Batched, so a multi-line write_working is revealed as one block. Never while the pen is down.
  const revealRef = useRef<{ y0: number; y1: number } | null>(null);
  const reveal = (y0: number, y1: number) => {
    const r = revealRef.current;
    revealRef.current = r ? { y0: Math.min(r.y0, y0), y1: Math.max(r.y1, y1) } : { y0, y1 };
    if (r) return;
    setTimeout(() => {
      const want = revealRef.current;
      revealRef.current = null;
      const el = scrollRef.current;
      if (!want || !el || currentRef.current) return;
      const u = unitPx(),
        band = safeBand();
      const top = want.y0 * u - el.scrollTop,
        bot = want.y1 * u - el.scrollTop;
      if (top >= band.top && bot <= band.bottom) return;
      const target = top < band.top || bot - top > band.bottom - band.top ? want.y0 * u - band.top : want.y1 * u - band.bottom;
      el.scrollTo({ top: Math.max(0, target), behavior: "smooth" });
    }, 80);
  };
  // First line Masterji may write on a fresh question page: below the floating card, in board units.
  const safeTopUnits = () => Math.max(120, safeBand().top / unitPx());

  // ---------- pages ----------
  const screenPx = () => ((inkRef.current?.clientWidth ?? 0) * SCREEN_H) / PAGE_W;
  const growTo = (n: number) => {
    if (n * SCREEN_H <= pageHRef.current) return;
    pageHRef.current = n * SCREEN_H;
    setPages(n);
  };
  // "+ Space": one more page below; scroll to it.
  const addSpace = () => {
    growTo(pageHRef.current / SCREEN_H + 0.5);
    requestAnimationFrame(() => scrollRef.current?.scrollBy({ top: screenPx() / 2, behavior: "smooth" }));
  };
  // New question: keep the old work above (read-only), start on a fresh page and scroll to it.
  const newQuestionPage = () => {
    if (strokesRef.current.length === 0 && linesRef.current.length === 0) return;
    const bottom = Math.max(0, ...strokesRef.current.map((s) => s.bbox.y + s.bbox.h), ...linesRef.current.map((l) => l.bottom));
    archivedRef.current.push(...strokesRef.current);
    for (const ink of penRef.current.values()) archivedInkRef.current.push(...(ink.mark ? [ink.mark] : []), ...ink.notes);
    archivedInkRef.current.push(...linesRef.current.map((l) => l.item));
    strokesRef.current = [];
    penRef.current.clear();
    linesRef.current = [];
    cancelPause();
    recluster(); // the Brain forgets the old clusters (clusterRemoved)
    const page = Math.floor(bottom / SCREEN_H) + 1;
    questionTopRef.current = page * SCREEN_H;
    growTo(page + 1);
    requestAnimationFrame(() => {
      redraw();
      scrollRef.current?.scrollTo({ top: page * screenPx(), behavior: "smooth" });
    });
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
      reveal(y - size - 8, y + 12);
      animUntilRef.current = Math.max(animUntilRef.current, note.start + note.item.total);
      penRef.current.set(clusterId, ink);
      drawOverlay([...clustersRef.current.values()]);
    });
    // writeLine from Voice → a full handwritten line of working under everything on the page.
    const offLine = bus.on("writeLine", ({ text }) => {
      const size = 30;
      const bottoms = [...clustersRef.current.values()].map((c) => c.bbox.y + c.bbox.h).concat(linesRef.current.map((l) => l.bottom));
      const y = Math.max(questionTopRef.current + safeTopUnits(), ...bottoms) + size + 40;
      if (y > pageHRef.current - 40) growTo(Math.ceil((y + 80) / SCREEN_H));
      // Consecutive lines (write_working) are written one after another, like a teacher.
      const lastEnd = Math.max(0, ...linesRef.current.map((l) => l.item.start + l.item.item.total));
      const item = { item: penText(text, 120, y, size).item, start: Math.max(performance.now(), lastEnd + 200) };
      linesRef.current.push({ item, bottom: y + 12 });
      animUntilRef.current = Math.max(animUntilRef.current, item.start + item.item.total);
      drawOverlay([...clustersRef.current.values()]);
      reveal(y - size - 10, y + 16);
    });
    // drawGraph from Voice → a hand-drawn graph under the current working.
    const offGraph = bus.on("drawGraph", (spec) => {
      const bottoms = [...clustersRef.current.values()].map((c) => c.bbox.y + c.bbox.h).concat(linesRef.current.map((l) => l.bottom));
      const top = Math.max(questionTopRef.current + safeTopUnits(), ...bottoms) + 70;
      const box = { x: 170, y: top, w: 640, h: 360 };
      if (box.y + box.h + 90 > pageHRef.current) growTo(Math.ceil((box.y + box.h + 120) / SCREEN_H));
      try {
        const item = { item: penGraph(spec, box), start: performance.now() };
        linesRef.current.push({ item, bottom: box.y + box.h + 70 });
        animUntilRef.current = Math.max(animUntilRef.current, item.start + item.item.total);
        drawOverlay([...clustersRef.current.values()]);
        reveal(box.y - 30, box.y + box.h + 80);
      } catch (e) {
        console.warn("[notebook] graph failed", e);
      }
    });
    return () => {
      offVerdict();
      offNote();
      offLine();
      offGraph();
    };
  }, [drawOverlay]);

  // ---------- pointer input ----------
  const toPoint = (e: React.PointerEvent<HTMLCanvasElement>): Point => {
    const rect = e.currentTarget.getBoundingClientRect();
    return {
      x: ((e.clientX - rect.left) / rect.width) * PAGE_W,
      y: ((e.clientY - rect.top) / rect.width) * PAGE_W,
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
          y: ((ce.clientY - rect.top) / rect.width) * PAGE_W,
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
    cur.rough = false; // rough work is on the pull-out RoughPad now
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
    archivedRef.current = [];
    archivedInkRef.current = [];
    questionTopRef.current = 0;
    pageHRef.current = SCREEN_H;
    setPages(1);
    penRef.current.clear();
    linesRef.current = [];
    redraw();
    cancelPause();
    recluster();
    scrollRef.current?.scrollTo({ top: 0, behavior: "smooth" });
  };

  // A new question (typed, or chosen by Masterji) starts on a clean page.
  const newQuestionRef = useRef(newQuestionPage);
  useEffect(() => {
    newQuestionRef.current = newQuestionPage;
  });
  useEffect(() => bus.on("questionConfirmed", () => newQuestionRef.current()), []);

  // Pen cursor dot (PLAN.md §3: the pen cursor dot is visible on the canvas).
  const cursor =
    tool === "eraser"
      ? "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='24' height='24'><circle cx='12' cy='12' r='10' fill='none' stroke='%23475569' stroke-width='1.5'/></svg>\") 12 12, cell"
      : "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='8' height='8'><circle cx='4' cy='4' r='3' fill='%231e293b'/></svg>\") 4 4, crosshair";

  const btn = (active: boolean) =>
    `flex h-9 min-w-9 items-center justify-center rounded-lg px-2 text-sm transition ${active ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-100"}`;

  return (
    <div ref={scrollRef} className="fixed inset-0 overflow-y-auto overflow-x-hidden bg-white">
      <div
        className="relative w-full"
        style={{
          aspectRatio: `${PAGE_W} / ${pages * SCREEN_H}`,
          backgroundColor: "#fdfdfc",
          backgroundImage:
            "linear-gradient(to right, #e7ebf0 1px, transparent 1px), linear-gradient(to bottom, #e7ebf0 1px, transparent 1px)",
          backgroundSize: `${(100 * GRID) / PAGE_W}% ${(100 * GRID) / (pages * SCREEN_H)}%`,
        }}
      >
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
      <div data-overlay="top" className="fixed right-4 top-4 flex items-center gap-1 rounded-xl border border-slate-200 bg-white/95 p-1 shadow-sm backdrop-blur">
        <button className={btn(tool === "pen")} onClick={() => setTool("pen")} title="Pen">
          ✏️
        </button>
        <button className={btn(tool === "eraser")} onClick={() => setTool("eraser")} title="Eraser">
          🧽
        </button>
        <button className={btn(false)} onClick={undo} title="Undo">
          ↶
        </button>
        <button className={btn(false)} onClick={addSpace} title="Add a page of space below">
          + Space
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

