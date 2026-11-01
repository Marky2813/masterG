"use client";

import { getStroke } from "perfect-freehand";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { bus } from "@/lib/bus";
import { kindOf } from "@/lib/brain/kind";
import { getSessionId } from "@/lib/log/client";
import { clearHomework, getHomework, homeworkRef, loadHomework, nextHomework, subscribeHomework, type Homework, type HomeworkItem } from "@/lib/sessionState";
import type { HomeworkRef, QuestionKind } from "@/lib/types";

// The question chip: type it, snap/upload/paste a photo, or write it by hand. Photos and
// handwriting are read by Gemini Flash (/api/question); Masterji then reads it back to confirm.
// 📄 Homework: a whole worksheet (photo, screenshot or pasted text, /api/worksheet) becomes a queue.

// Big photos are downscaled before upload (max 1400 px side, JPEG; worksheets 2000 px to keep small print legible).
async function toDataUrl(file: Blob, maxSide = 1400): Promise<string> {
  const bmp = await createImageBitmap(file);
  const s = Math.min(1, maxSide / Math.max(bmp.width, bmp.height));
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
    <div className="absolute left-1/2 top-full z-30 mt-2 -translate-x-1/2 w-[min(40rem,calc(100vw-2rem))] rounded-xl border border-slate-200 bg-white p-3 shadow-lg">
      <div className="mb-2 text-xs text-slate-500">Write the question here</div>
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
          Done
        </button>
      </div>
    </div>
  );
}

// Load the teacher's homework: a worksheet photo/screenshot, or the text pasted (e.g. from WhatsApp).
function HomeworkPanel({ onImage, onText, onCancel }: { onImage: (f: File) => void; onText: (t: string) => void; onCancel: () => void }) {
  const [text, setText] = useState("");
  const ref = useRef<HTMLInputElement>(null);
  return (
    <div className="absolute left-1/2 top-full z-30 mt-2 -translate-x-1/2 w-[min(28rem,calc(100vw-2rem))] rounded-xl border border-slate-200 bg-white p-3 shadow-lg">
      <div className="text-sm font-medium text-slate-800">Homework from your teacher</div>
      <div className="mb-2 text-xs text-slate-500">Add a photo or screenshot of the worksheet (Ctrl+V works too), or paste the homework text. Masterji will go through every question one by one.</div>
      <button type="button" className="mb-2 w-full rounded-lg border border-dashed border-amber-300 bg-amber-50/60 px-3 py-2 text-sm text-amber-900 hover:bg-amber-50" onClick={() => ref.current?.click()}>
        📷 Worksheet ki photo / screenshot
      </button>
      <input
        ref={ref}
        type="file"
        accept="image/*"
        className="hidden"
        data-testid="homework-file"
        onChange={(e) => {
          const f = e.target.files?.[0];
          e.target.value = "";
          if (f) onImage(f);
        }}
      />
      <textarea
        className="h-24 w-full resize-none rounded-lg border border-slate-200 p-2 font-mono text-xs outline-none placeholder:text-slate-400 focus:border-slate-400"
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={"Or paste it here:\n1) 3/4 + 1/6\n2) 2x + 5 = 11"}
      />
      <div className="mt-2 flex justify-end gap-2 text-sm">
        <button type="button" className="rounded-md px-3 py-1 text-slate-500" onClick={onCancel}>
          Cancel
        </button>
        <button type="button" className="rounded-md bg-slate-900 px-3 py-1 text-white disabled:opacity-40" disabled={!text.trim()} onClick={() => onText(text.trim())}>
          Read homework
        </button>
      </div>
    </div>
  );
}

// The loaded homework: "Homework 2/6", prev/next, and a list to jump to any question.
function HomeworkQueue({ homework, open, setOpen, pick }: { homework: Homework; open: boolean; setOpen: (f: (o: boolean) => boolean) => void; pick: (i: number) => void }) {
  const { items, current, done, title } = homework;
  const n = items.length;
  const nav = "rounded px-1.5 text-sm leading-5 text-amber-900 hover:bg-amber-100 disabled:opacity-30";
  return (
    <div className="relative mt-1">
      <div className="flex items-center gap-1 rounded-lg border border-amber-200 bg-amber-50/95 px-2 py-1 text-xs text-amber-900 shadow-sm">
        <button type="button" className="flex items-center gap-1 font-medium" title="All homework questions" onClick={() => setOpen((o) => !o)}>
          <span>📄</span>
          <span>
            Homework {current === null ? "–" : current + 1}/{n}
          </span>
          <span className="text-amber-700/70">{open ? "▴" : "▾"}</span>
        </button>
        <span className="ml-1 text-amber-700/70">{done.length === n ? "all done ✓" : `${done.length} done`}</span>
        <span className="flex-1" />
        <button type="button" className={nav} aria-label="Previous homework question" disabled={current === null || current === 0} onClick={() => pick((current ?? 1) - 1)}>
          ‹
        </button>
        <button
          type="button"
          className={nav}
          aria-label="Next homework question"
          disabled={current === n - 1}
          onClick={() => pick(current === null ? (nextHomework()?.index ?? 0) : current + 1)}
        >
          ›
        </button>
        <button type="button" className={nav} aria-label="Close homework" title="Close homework" onClick={clearHomework}>
          ×
        </button>
      </div>
      {open && (
        <div className="absolute left-1/2 top-full z-30 mt-1 -translate-x-1/2 max-h-72 w-[min(24rem,calc(100vw-2rem))] overflow-y-auto rounded-xl border border-slate-200 bg-white p-1.5 shadow-lg">
          {title && <div className="px-2 pb-1 pt-0.5 text-[11px] uppercase tracking-wide text-slate-400">{title}</div>}
          {items.map((q, i) => (
            <button
              key={i}
              type="button"
              onClick={() => pick(i)}
              title={q.text}
              className={`flex w-full items-baseline gap-2 rounded-lg px-2 py-1 text-left text-sm ${i === current ? "bg-amber-50 text-slate-900" : "text-slate-700 hover:bg-slate-50"}`}
            >
              <span className="w-8 shrink-0 text-xs text-slate-400">{q.label ?? i + 1}</span>
              <span className={`min-w-0 flex-1 truncate ${q.kind === "word_problem" ? "" : "font-mono"}`}>{q.text}</span>
              {done.includes(i) && <span className="text-emerald-600">✓</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function QuestionBox() {
  const [draft, setDraft] = useState("");
  const [confirmed, setConfirmed] = useState<string | null>(null);
  const [reading, setReading] = useState(false);
  const [error, setError] = useState("");
  const [pad, setPad] = useState(false);
  const [hwPanel, setHwPanel] = useState(false);
  const [hwList, setHwList] = useState(false);
  const homework = useSyncExternalStore(subscribeHomework, getHomework, () => null);
  const hwSource = useRef<"photo" | "typed">("photo");
  const fileRef = useRef<HTMLInputElement>(null);

  // Masterji can set the next question himself (set_question tool).
  useEffect(() => bus.on("questionConfirmed", ({ text }) => setConfirmed(text)), []);

  const confirm = (text: string, kind: QuestionKind, source: "typed" | "photo" | "handwritten", homework?: HomeworkRef) => {
    bus.emit("questionSubmitted", { source, text });
    bus.emit("questionConfirmed", homework ? { text, kind, homework } : { text, kind });
    setConfirmed(text);
    setDraft("");
  };

  // Put homework question i on the board, exactly like confirming a typed/photo question.
  const pickHomework = (i: number) => {
    const item = getHomework()?.items[i];
    if (!item) return;
    setHwList(false);
    confirm(item.text, item.kind, hwSource.current, homeworkRef(i));
  };

  const readWorksheet = async (body: { imagePng?: string; text?: string }, source: "photo" | "typed") => {
    setHwPanel(false);
    setPad(false);
    setReading(true);
    setError("");
    try {
      const res = await fetch("/api/worksheet", {
        method: "POST",
        headers: { "content-type": "application/json", "x-session-id": getSessionId() },
        body: JSON.stringify({ ...body, source }),
      });
      const r = (await res.json()) as { questions?: HomeworkItem[]; title?: string; error?: string };
      if (!res.ok) throw new Error(r.error ?? `HTTP ${res.status}`);
      if (!r.questions?.length) throw new Error("No questions found in this homework. Try a clearer photo or the text.");
      hwSource.current = source;
      loadHomework(r.questions, r.title);
      pickHomework(0);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setReading(false);
    }
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
      if (!r.legible || !r.text) throw new Error("Couldn't read the question. Try a clearer photo or neater writing.");
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
      // With the homework panel open, a pasted screenshot is the whole worksheet.
      if (hwPanel) void toDataUrl(file, 2000).then((imagePng) => readWorksheet({ imagePng }, "photo"));
      else void toDataUrl(file).then((url) => readImage(url, "photo"));
    };
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const text = draft.trim();
    if (text) confirm(text, kindOf(text), "typed");
  };

  const iconBtn = "flex size-8 items-center justify-center rounded-lg text-base text-slate-500 transition hover:bg-amber-50 disabled:opacity-40";

  // The question sits at the top centre of the page, like a sum written at the top of a notebook page.
  return (
    <div className="relative flex flex-col items-center">
      <form onSubmit={submit} className="flex max-w-full items-center gap-2 rounded-2xl border border-amber-200 bg-white/95 py-1.5 pr-1.5 pl-4 shadow-[0_2px_10px_rgba(120,90,20,0.10)] backdrop-blur">
        <span className="shrink-0 text-[10px] font-bold tracking-[0.14em] text-amber-700/80 uppercase">Question</span>
        {reading ? (
          <span className="px-1 text-base text-slate-500">Reading…</span>
        ) : confirmed ? (
          <button
            type="button"
            className="min-w-0 max-w-[26rem] truncate px-1 font-mono text-[22px] leading-tight font-semibold text-slate-900"
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
              className="w-56 min-w-0 bg-transparent px-1 font-mono text-lg outline-none placeholder:text-base placeholder:text-slate-400"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="e.g. 3/4 + 1/6"
              aria-label="Question"
            />
            <button className="shrink-0 rounded-lg bg-slate-900 px-3 py-1 text-sm font-medium text-white">Set</button>
          </>
        )}
        <span className="h-6 w-px shrink-0 bg-amber-100" />
        <button type="button" className={iconBtn} title="Photo / screenshot of the question (or paste with Ctrl+V)" disabled={reading} onClick={() => fileRef.current?.click()}>
          📷
        </button>
        <button type="button" className={iconBtn} title="Write the question by hand" disabled={reading} onClick={() => setPad((p) => !p)}>
          ✍️
        </button>
        <button
          type="button"
          className={iconBtn}
          title="Homework from your teacher: a worksheet photo, screenshot or pasted text"
          aria-label="Homework"
          disabled={reading}
          onClick={() => {
            setPad(false);
            setHwList(false);
            setHwPanel((p) => !p);
          }}
        >
          📄
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
      {homework && <HomeworkQueue homework={homework} open={hwList} setOpen={setHwList} pick={pickHomework} />}
      {error && <div className="mt-1 rounded-md bg-rose-50 px-2 py-1 text-xs text-rose-700">{error}</div>}
      {pad && <WritePad onDone={(png) => readImage(png, "handwritten")} onCancel={() => setPad(false)} />}
      {hwPanel && (
        <HomeworkPanel
          onImage={(f) => void toDataUrl(f, 2000).then((imagePng) => readWorksheet({ imagePng }, "photo"))}
          onText={(text) => void readWorksheet({ text }, "typed")}
          onCancel={() => setHwPanel(false)}
        />
      )}
    </div>
  );
}
