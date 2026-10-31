"use client";

import { getStroke } from "perfect-freehand";
import { useCallback, useEffect, useRef, useState } from "react";
import PLAN from "../../../benchmark/sample-plan.json";

// Guided benchmark capture: shows the next step from benchmark/sample-plan.json,
// you write it with the stylus, press Next (or Enter). Labels come from the plan,
// so there's nothing to type. Saved to benchmark/samples/ (PNG + labels.json).
// Resumes where you left off (counts what's already saved). PLAN.md §7.

interface PlanRow {
  topic: string;
  question: string;
  previous: string;
  write: string;
  correct: boolean;
  category: string;
  messy: string;
}
const ROWS = PLAN as PlanRow[];

const WIDTH = 1000;
const HEIGHT = 240;

type Pt = [number, number, number];

function strokePath(points: Pt[]): Path2D {
  const outline = getStroke(points, { size: 6, thinning: 0.6, smoothing: 0.5, streamline: 0.4 });
  const path = new Path2D();
  if (outline.length === 0) return path;
  path.moveTo(outline[0][0], outline[0][1]);
  for (const [x, y] of outline.slice(1)) path.lineTo(x, y);
  path.closePath();
  return path;
}

// What to physically write: × for *, ÷ is never used, mixed numbers shown as written by hand.
const handwritten = (s: string) =>
  s
    .replace(/\s*\*\s*/g, " × ")
    .replace(/\(1\+1\/2\)/g, "1½")
    .replace(/\(2\+1\/3\)/g, "2⅓")
    .replace(/\(3\+5\/6\)/g, "3⅚")
    .replace(/\blcm\b/g, "LCM")
    .replace(/\bhcf\b/g, "HCF");

export default function CapturePage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const strokesRef = useRef<Pt[][]>([]);
  const currentRef = useRef<Pt[] | null>(null);
  const [index, setIndex] = useState<number | null>(null); // = samples already saved
  const [status, setStatus] = useState("");
  const [saving, setSaving] = useState(false);

  const redraw = useCallback(() => {
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
    ctx.strokeStyle = "#dbe7f3";
    ctx.lineWidth = 1;
    for (let y = 60; y < HEIGHT; y += 60) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(WIDTH, y);
      ctx.stroke();
    }
    ctx.fillStyle = "#1e293b";
    for (const s of strokesRef.current) ctx.fill(strokePath(s));
    if (currentRef.current) ctx.fill(strokePath(currentRef.current));
  }, []);

  useEffect(() => {
    redraw();
    fetch("/api/samples")
      .then((r) => r.json())
      .then((l: unknown[]) => setIndex(l.length))
      .catch(() => setIndex(0));
  }, [redraw]);

  const toPoint = (e: React.PointerEvent<HTMLCanvasElement>): Pt => {
    const rect = e.currentTarget.getBoundingClientRect();
    return [
      ((e.clientX - rect.left) / rect.width) * WIDTH,
      ((e.clientY - rect.top) / rect.height) * HEIGHT,
      e.pointerType === "pen" ? e.pressure : 0.5,
    ];
  };
  const onDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    currentRef.current = [toPoint(e)];
    redraw();
  };
  const onMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!currentRef.current) return;
    currentRef.current.push(toPoint(e));
    redraw();
  };
  const onUp = () => {
    if (currentRef.current) strokesRef.current.push(currentRef.current);
    currentRef.current = null;
    redraw();
  };
  const clear = useCallback(() => {
    strokesRef.current = [];
    redraw();
  }, [redraw]);
  const undo = () => {
    strokesRef.current.pop();
    redraw();
  };

  const row = index !== null && index < ROWS.length ? ROWS[index] : null;

  const next = useCallback(async () => {
    if (!row || index === null || saving) return;
    if (strokesRef.current.length === 0) {
      setStatus("Write it first.");
      return;
    }
    setSaving(true);
    const png = canvasRef.current!.toDataURL("image/png");
    const label = {
      topic: row.topic,
      question: row.question || undefined,
      previous: row.previous || undefined,
      expectedText: row.write,
      isCorrect: row.correct,
      category: row.correct ? undefined : row.category || undefined,
    };
    const res = await fetch("/api/samples", { method: "POST", body: JSON.stringify({ png, label }) });
    setSaving(false);
    if (!res.ok) {
      setStatus(`Save failed: ${await res.text()}`);
      return;
    }
    const { id, count } = await res.json();
    setStatus(`Saved ${id}`);
    setIndex(count);
    clear();
  }, [row, index, saving, clear]);

  // Enter = Next, Backspace = undo, Escape = clear.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Enter") void next();
      else if (e.key === "Backspace") undo();
      else if (e.key === "Escape") clear();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  if (index === null) return <main className="p-6">Loading…</main>;

  return (
    <main className="mx-auto max-w-5xl space-y-4 p-6 text-slate-900">
      <header className="flex items-baseline justify-between">
        <h1 className="text-2xl font-semibold">Benchmark capture</h1>
        <span className="text-sm text-slate-600">
          {Math.min(index, ROWS.length)} / {ROWS.length} saved
        </span>
      </header>

      {row ? (
        <div className="rounded-lg border border-slate-300 bg-amber-50 p-4">
          <div className="text-sm text-slate-500">
            #{index + 1} · {row.topic} · question: <span className="font-mono">{row.question}</span>
            {row.previous && (
              <>
                {" "}
                · line before: <span className="font-mono">{handwritten(row.previous)}</span>
              </>
            )}
          </div>
          <div className="mt-2 text-sm text-slate-600">Write exactly this (mistakes included):</div>
          <div className="font-mono text-4xl font-semibold tracking-wide">{handwritten(row.write)}</div>
          <div className="mt-2 flex gap-3 text-sm">
            <span className={row.correct ? "text-emerald-700" : "text-rose-700"}>
              {row.correct ? "✅ correct step" : `❌ wrong step${row.category ? ` (${row.category})` : ""}`}
            </span>
            {row.messy && <span className="font-medium text-amber-700">✍️ messy: {row.messy}</span>}
          </div>
        </div>
      ) : (
        <div className="rounded-lg border border-emerald-300 bg-emerald-50 p-4 text-lg">
          All {ROWS.length} done. Tell Claude, or commit <code>benchmark/samples/</code> and open a PR.
        </div>
      )}

      <canvas
        ref={canvasRef}
        width={WIDTH}
        height={HEIGHT}
        className="w-full touch-none rounded-lg border border-slate-300 shadow-sm"
        style={{ cursor: "crosshair" }}
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerLeave={onUp}
      />

      <div className="flex items-center gap-2">
        <button className="rounded bg-slate-200 px-3 py-2" onClick={undo}>
          Undo
        </button>
        <button className="rounded bg-slate-200 px-3 py-2" onClick={clear}>
          Clear
        </button>
        <button
          className="ml-auto rounded bg-emerald-600 px-6 py-2 text-lg font-medium text-white disabled:opacity-50"
          onClick={() => void next()}
          disabled={!row || saving}
        >
          Next →
        </button>
      </div>
      <p className="text-sm text-slate-500">
        Keys: <b>Enter</b> = Next · <b>Backspace</b> = undo · <b>Esc</b> = clear. {status}
      </p>
    </main>
  );
}
