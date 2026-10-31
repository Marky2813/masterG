"use client";

// Report recorder: listens to the real session on the bus and keeps a Report (model.ts) of what
// happened, question by question. Nothing here is invented: every field comes from an event.
// Started from /learn like startStepService; the 📋 Report button reads snapshot().
import { bus } from "../bus";
import type { MasterGEvents } from "../types";
import type { Report, ReportQuestion, ReportStep } from "./model";

// Same phrases the step service treats as "stuck" (src/lib/brain/stepService.ts), Hinglish and Devanagari.
export const STUCK_RE =
  /nahi\s*(aata|aati|pata)|pata\s*nahi|samajh\s*nahi|नहीं\s*(आता|आती|पता)|पता\s*नहीं|समझ\s*नहीं|don'?t know|no idea/i;

export const LOCAL_KEY = "masterg.report.latest";

let report: Report | null = null;
let current: ReportQuestion | null = null;
const tops = new Map<string, number>(); // cluster id → top y on the page
const strokesOf = new Map<string, string[]>(); // cluster id → its stroke ids (to spot merges)
const removed = new Set<string>(); // clusters that left the board (erased, merged, or a new page)
// Mistakes removed in the current tick. A whole page going at once (Clear, or a new question
// archiving the page) is not the kid erasing a mistake, so those get un-marked.
let justRemoved: ReportStep[] = [];
let removedThisTick = 0;
const unmarkPage = () => {
  for (const s of justRemoved) delete s.x;
  justRemoved = [];
};

const now = () => Date.now();

function touch(): void {
  if (!report) return;
  const t = now();
  report.t1 = t;
  if (current) current.t1 = t;
}

// Work done before any question was set still counts, under an empty question ("free practice").
function question(): ReportQuestion {
  if (!report) throw new Error("recorder not started");
  if (!current) {
    current = { q: "", k: "chain", t0: now(), t1: now(), st: [] };
    report.qs.push(current);
  }
  return current;
}

function onQuestion(q: MasterGEvents["questionConfirmed"]): void {
  if (!report) return;
  unmarkPage(); // the Notebook archived the page for this question just before we heard of it
  // The same sum confirmed twice in a row with nothing written yet is one question, not two.
  if (current && current.q === q.text && current.st.length === 0) return;
  // An empty "free practice" bucket with nothing in it is replaced by the real question.
  if (
    current &&
    current.q === "" &&
    current.st.length === 0 &&
    !current.m &&
    !current.n
  )
    report.qs.pop();
  const hw = (
    q as { homework?: { index?: unknown; total?: unknown; title?: unknown } }
  ).homework;
  current = {
    q: q.text,
    k: q.kind,
    t0: now(),
    t1: now(),
    st: [],
    ...(hw && typeof hw.index === "number" && typeof hw.total === "number"
      ? {
          hw: {
            i: hw.index + 1,
            n: hw.total, // HomeworkRef.index is 0-based (PR #62); the report shows 1-based
            ...(typeof hw.title === "string" ? { ti: hw.title } : {}),
          },
        }
      : {}),
  };
  report.qs.push(current);
  touch();
}

function onVerdict(v: MasterGEvents["verdict"]): void {
  if (!report) return;
  const q = question();
  let s: ReportStep | undefined = q.st.find((x) => x.id === v.clusterId);
  if (!s) {
    s = {
      id: v.clusterId,
      t: v.text,
      s: "u",
      y: tops.get(v.clusterId) ?? 0,
      a: now() - q.t0,
    };
    q.st.push(s);
  }
  s.t = v.text || s.t;
  s.s = v.status === "correct" ? "c" : v.status === "wrong" ? "w" : "u";
  delete s.x;
  if (v.status === "wrong") {
    s.w = 1;
    if (v.category) {
      s.c = v.category;
      const label = (v as { categoryLabel?: unknown }).categoryLabel;
      if (typeof label === "string" && label) s.l = label;
    }
  }
  if (v.hintRung > (s.r ?? 0)) s.r = v.hintRung;
  if (v.handwriting === "messy") s.h = v.handwritingNote || "hard to read";
  else if (v.handwriting) delete s.h; // rewritten neatly: the latest read wins
  touch();
}

// A cluster left the board. Its step stays in the report unless it was never judged: a new question
// archives the whole page (clusterRemoved for every cluster), and finished work must not vanish.
// A mistake the kid erased stays too, struck through: the teacher should see it.
function onRemoved(id: string): void {
  tops.delete(id);
  if (!report) return;
  removed.add(id);
  if (++removedThisTick === 1)
    queueMicrotask(() => {
      if (removedThisTick >= 2) unmarkPage();
      justRemoved = [];
      removedThisTick = 0;
    });
  for (const q of report.qs) {
    const i = q.st.findIndex((x) => x.id === id);
    if (i < 0) continue;
    if (q.st[i].s === "u") q.st.splice(i, 1);
    else if (q.st[i].s === "w") {
      q.st[i].x = 1;
      justRemoved.push(q.st[i]);
    }
  }
  touch();
}

// Strokes of a removed cluster turning up in another cluster = the two merged (the line grew).
// The merged-away part is not a step of its own any more, unless it was a mistake.
function onUpdated(id: string, y: number, strokeIds: string[]): void {
  tops.set(id, y);
  strokesOf.set(id, strokeIds);
  removed.delete(id);
  if (!current) return;
  const mine = new Set(strokeIds);
  current.st = current.st.filter((s) => {
    if (s.id === id) {
      s.y = y;
      return true;
    }
    const merged =
      removed.has(s.id) && (strokesOf.get(s.id) ?? []).some((k) => mine.has(k));
    return !merged || s.w === 1;
  });
}

function wrote(kind: "l" | "g" | "s" | "n", count = 1): void {
  if (!report) return;
  const q = question();
  q.m = { ...q.m, [kind]: (q.m?.[kind] ?? 0) + count };
  touch();
}

export function startReportRecorder(): () => void {
  report = { v: 1, t0: now(), t1: now(), qs: [] };
  current = null;
  tops.clear();
  strokesOf.clear();
  removed.clear();
  justRemoved = [];
  removedThisTick = 0;
  const offs = [
    bus.on("questionConfirmed", onQuestion),
    bus.on("verdict", onVerdict),
    bus.on("clusterUpdated", ({ id, bbox, strokeIds }) =>
      onUpdated(id, Math.round(bbox.y), strokeIds),
    ),
    bus.on("clusterRemoved", ({ id }) => onRemoved(id)),
    bus.on("userUtterance", ({ text }) => {
      if (!report || !STUCK_RE.test(text)) return;
      const q = question();
      q.n = (q.n ?? 0) + 1;
      touch();
    }),
    bus.on("writeLine", () => wrote("l")),
    bus.on("writeNote", () => wrote("n")),
    bus.on("drawGraph", () => wrote("g")),
    bus.on("drawCounting", () => wrote("s")),
  ];
  return () => offs.forEach((off) => off());
}

// A deep copy of the session so far, with questions that saw no activity left out.
export function snapshot(): Report | null {
  if (!report) return null;
  const copy = JSON.parse(JSON.stringify(report)) as Report;
  copy.qs = copy.qs.filter((q) => q.st.length || q.m || q.n || q.q);
  return copy;
}
