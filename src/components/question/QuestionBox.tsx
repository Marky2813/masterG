"use client";

import { getStroke } from "perfect-freehand";
import { useEffect, useRef, useState } from "react";
import { bus } from "@/lib/bus";
import { kindOf } from "@/lib/brain/kind";
import { getSessionId } from "@/lib/log/client";
import type { QuestionKind } from "@/lib/types";

// The question chip: type it, snap/upload/paste a photo, or write it by hand. Photos and
// handwriting are read by Gemini Flash (/api/question); Masterji then reads it back to confirm.

// Big photos are downscaled before upload (max 1400 px side, JPEG).
async function toDataUrl(file: Blob): Promise<string> {
  const bmp = await createImageBitmap(file);
  const s = Math.min(1, 1400 / Math.max(bmp.width, bmp.height));
  const c = document.createElement("canvas");
  c.width = Math.round(bmp.width * s);
  c.height = Math.round(bmp.height * s);
  c.getContext("2d")!.drawImage(bmp, 0, 0, c.width, c.height);
  return c.toDataURL("image/jpeg", 0.88);
}

type Pt = [number, number, number];
function inkPath(points: Pt[]): Path2D {
  const o = getStroke(points, { size: 5, thinning: 0.6, smoothing: 0.5, streamline: 0.4, simulatePressure: false });
  const p = new Path2D();
  if (!o.length) return p;
  p.moveTo(o[0][0], o[0][1]);
  for (const [x, y] of o.slice(1)) p.lineTo(x, y);
  p.closePath();
  return p;
}

// Small pad to write the question by hand.
function WritePad({ onDone, onCancel }: { onDone: (png: string) => void; onCancel: () => void }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const strokes = useRef<Pt[][]>([]);
  const cur = useRef<Pt[] | null>(null);
  const W = 640,
    H = 200;
  const draw = () => {
    const ctx = ref.current!.getContext("2d")!;
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = "#1e293b";
    for (const s of strokes.current) ctx.fill(inkPath(s));
    if (cur.current) ctx.fill(inkPath(cur.current));
  };
  useEffect(draw, []);
  const pt = (e: React.PointerEvent<HTMLCanvasElement>): Pt => {
    const r = e.currentTarget.getBoundingClientRect();
    return [((e.clientX - r.left) / r.width) * W, ((e.clientY - r.top) / r.height) * H, e.pointerType === "pen" ? Math.max(0.05, e.pressure) : 0.5];
  };
  return (
    <div className="absolute left-0 top-full z-30 mt-2 w-[min(40rem,calc(100vw-2rem))] rounded-xl border border-slate-200 bg-white p-3 shadow-lg">
      <div className="mb-2 text-xs text-slate-500">Sawaal yahaan likho</div>
      <canvas
        ref={ref}
        width={W}
        height={H}
        className="w-full touch-none rounded-lg border border-slate-200"
        style={{ cursor: "crosshair" }}
        onPointerDown={(e) => {
          e.currentTarget.setPointerCapture(e.pointerId);
          cur.current = [pt(e)];
        }}
        onPointerMove={(e) => {
          if (!cur.current) return;
          cur.current.push(pt(e));
          draw();
        }}
        onPointerUp={() => {
          if (cur.current) strokes.current.push(cur.current);
          cur.current = null;
          draw();
        }}
      />
      <div className="mt-2 flex justify-end gap-2 text-sm">
        <button type="button" className="rounded-md px-3 py-1 text-slate-500" onClick={onCancel}>
          Cancel
        </button>
        <button
          type="button"
          className="rounded-md px-3 py-1 text-slate-600"
          onClick={() => {
            strokes.current = [];
            draw();
          }}
        >
          Clear
        </button>
        <button type="button" className="rounded-md bg-slate-900 px-3 py-1 text-white" onClick={() => strokes.current.length && onDone(ref.current!.toDataURL("image/png"))}>
          Ho gaya
        </button>
      </div>
    </div>
  );
}

export default function QuestionBox() {
  const [draft, setDraft] = useState("");
  const [confirmed, setConfirmed] = useState<string | null>(null);
  const [reading, setReading] = useState(false);
  const [error, setError] = useState("");
  const [pad, setPad] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // Masterji can set the next question himself (set_question tool).
  useEffect(() => bus.on("questionConfirmed", ({ text }) => setConfirmed(text)), []);

  const confirm = (text: string, kind: QuestionKind, source: "typed" | "photo" | "handwritten") => {
    bus.emit("questionSubmitted", { source, text });
    bus.emit("questionConfirmed", { text, kind });
    setConfirmed(text);
    setDraft("");
  };

  const readImage = async (imagePng: string, source: "photo" | "handwritten") => {
    setPad(false);
    setReading(true);
    setError("");
    try {
      const res = await fetch("/api/question", {
        method: "POST",
        headers: { "content-type": "application/json", "x-session-id": getSessionId() },
        body: JSON.stringify({ imagePng, source }),
      });
      const r = await res.json();
      if (!res.ok) throw new Error(r.error ?? `HTTP ${res.status}`);
      if (!r.legible || !r.text) throw new Error("Sawaal padh nahi paya. Saaf photo ya likhai try karo.");
      confirm(r.text, r.kind, source);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setReading(false);
    }
  };

  // Paste a screenshot anywhere: it becomes the question.
  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      const item = [...(e.clipboardData?.items ?? [])].find((i) => i.type.startsWith("image/"));
      const file = item?.getAsFile();
      if (!file) return;
      e.preventDefault();
      void toDataUrl(file).then((url) => readImage(url, "photo"));
    };
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const text = draft.trim();
    if (text) confirm(text, kindOf(text), "typed");
  };

  const iconBtn = "rounded-md px-1.5 py-0.5 text-base text-slate-600 hover:bg-slate-100 disabled:opacity-40";

  return (
    <div className="relative self-start">
      <form onSubmit={submit} className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white/95 px-3 py-1.5 shadow-sm backdrop-blur">
        {reading ? (
          <span className="text-sm text-slate-500">Padh raha hoon…</span>
        ) : confirmed ? (
          <button
            type="button"
            className="max-w-[24rem] truncate font-mono text-base text-slate-800"
            title="Change the question"
            onClick={() => {
              setConfirmed(null);
              setDraft(confirmed);
            }}
          >
            {confirmed}
          </button>
        ) : (
          <>
            <input
              className="w-52 bg-transparent font-mono text-sm outline-none placeholder:text-slate-400"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Sawaal likho: 3/4 + 1/6"
            />
            <button className="rounded-md bg-slate-900 px-2 py-0.5 text-xs text-white">Set</button>
          </>
        )}
        <span className="mx-0.5 h-5 w-px bg-slate-200" />
        <button type="button" className={iconBtn} title="Photo / screenshot of the question (or paste with Ctrl+V)" disabled={reading} onClick={() => fileRef.current?.click()}>
          📷
        </button>
        <button type="button" className={iconBtn} title="Write the question by hand" disabled={reading} onClick={() => setPad((p) => !p)}>
          ✍️
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            e.target.value = "";
            if (f) void toDataUrl(f).then((url) => readImage(url, "photo"));
          }}
        />
      </form>
      {error && <div className="mt-1 rounded-md bg-rose-50 px-2 py-1 text-xs text-rose-700">{error}</div>}
      {pad && <WritePad onDone={(png) => readImage(png, "handwritten")} onCancel={() => setPad(false)} />}
    </div>
  );
}
