"use client";

import { getStroke } from "perfect-freehand";
import { useCallback, useEffect, useRef, useState } from "react";
import { SEED_CATEGORIES } from "@/lib/categories";

// Benchmark sample capture: write one step with the stylus, label it, save.
// Saved to benchmark/samples/ (PNG + labels.json). See PLAN.md §7.

const WIDTH = 1000;
const HEIGHT = 240;
const TOPICS = ["fractions", "linear", "bodmas_decimals", "lcm_hcf", "word_problem", "other"];

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

export default function CapturePage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const strokesRef = useRef<Pt[][]>([]);
  const currentRef = useRef<Pt[] | null>(null);

  const [topic, setTopic] = useState(TOPICS[0]);
  const [question, setQuestion] = useState("");
  const [previous, setPrevious] = useState("");
  const [expectedText, setExpectedText] = useState("");
  const [isCorrect, setIsCorrect] = useState(true);
  const [category, setCategory] = useState("");
  const [count, setCount] = useState(0);
  const [status, setStatus] = useState("");

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
      .then((l: unknown[]) => setCount(l.length))
      .catch(() => {});
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

  const clear = () => {
    strokesRef.current = [];
    redraw();
  };
  const undo = () => {
    strokesRef.current.pop();
    redraw();
  };

  const save = async () => {
    if (strokesRef.current.length === 0 || !expectedText.trim()) {
      setStatus("Write something and fill in 'what's written' first.");
      return;
    }
    const png = canvasRef.current!.toDataURL("image/png");
    const label = {
      topic,
      question: question.trim() || undefined,
      previous: previous.trim() || undefined,
      expectedText: expectedText.trim(),
      isCorrect,
      category: isCorrect ? undefined : category || undefined,
    };
    const res = await fetch("/api/samples", { method: "POST", body: JSON.stringify({ png, label }) });
    if (!res.ok) {
      setStatus(`Save failed: ${await res.text()}`);
      return;
    }
    const { id, count: n } = await res.json();
    setCount(n);
    setStatus(`Saved ${id}`);
    // Ready for the next step of the same problem.
    setPrevious(isCorrect ? expectedText.trim() : previous);
    setExpectedText("");
    setIsCorrect(true);
    setCategory("");
    clear();
  };

  const input = "rounded border border-slate-300 px-2 py-1 font-mono text-sm";

  return (
    <main className="mx-auto max-w-5xl space-y-4 p-6 text-slate-900">
      <header className="flex items-baseline justify-between">
        <h1 className="text-2xl font-semibold">Benchmark sample capture</h1>
        <span className="text-sm text-slate-600">{count} samples saved</span>
      </header>
      <p className="text-sm text-slate-600">
        Write <b>one step</b> with the stylus the way a kid would — about half with a typical mistake, some with messy
        digits (1/7, 4/9). Then type exactly what you wrote in mathjs syntax and save.
      </p>

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
      <div className="flex gap-2">
        <button className="rounded bg-slate-200 px-3 py-1" onClick={undo}>
          Undo
        </button>
        <button className="rounded bg-slate-200 px-3 py-1" onClick={clear}>
          Clear
        </button>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label className="flex flex-col gap-1 text-sm">
          Topic
          <select className={input} value={topic} onChange={(e) => setTopic(e.target.value)}>
            {TOPICS.map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Question (mathjs syntax, or words for word problems)
          <input className={input} value={question} onChange={(e) => setQuestion(e.target.value)} placeholder="3/4 + 1/6" />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Previous step (blank if this is the first step)
          <input className={input} value={previous} onChange={(e) => setPrevious(e.target.value)} placeholder="= 9/12 + 2/12" />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          What&apos;s written in this step (exactly, mistakes included)
          <input
            className={input}
            value={expectedText}
            onChange={(e) => setExpectedText(e.target.value)}
            placeholder="3/4 + 1/6 = 4/10"
          />
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={isCorrect} onChange={(e) => setIsCorrect(e.target.checked)} />
          This step is correct
        </label>
        {!isCorrect && (
          <label className="flex flex-col gap-1 text-sm">
            Mistake category
            <select className={input} value={category} onChange={(e) => setCategory(e.target.value)}>
              <option value="">(other / none fits)</option>
              {SEED_CATEGORIES.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.id} — {c.label}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>

      <div className="flex items-center gap-3">
        <button className="rounded bg-emerald-600 px-4 py-2 font-medium text-white" onClick={save}>
          Save sample
        </button>
        <span className="text-sm text-slate-600">{status}</span>
      </div>
    </main>
  );
}
