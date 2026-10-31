"use client";

// Brain, client side: turns each clusterUpdated into a verdict on the bus.
// Reading order is top to bottom; a step is judged against the confirmed
// question and the nearest correct step above it. PLAN.md §5.
import { bus } from "../bus";
import { SEED_CATEGORIES } from "../categories";
import type { BBox, ErrorCategory, HintRung, MarkType, QuestionKind, Verdict } from "../types";
import type { JudgeResult } from "../gemini/judge";
import { clientLog, getSessionId } from "../log/client";
import { waitForQuietPen } from "../notebook/penState";

interface ClusterState {
  id: string;
  bbox: BBox;
  version: number;
  result?: JudgeResult;
}

export interface StepServiceDebug {
  onResult?: (clusterId: string, r: JudgeResult | { error: string }) => void;
}

export function startStepService(debug: StepServiceDebug = {}): () => void {
  const clusters = new Map<string, ClusterState>();
  const categories: ErrorCategory[] = [...SEED_CATEGORIES];
  const categoryCounts = new Map<string, number>();
  // Hint ladder (PLAN.md §2): one rung per failed attempt on the same step, or per "nahi aata".
  const rungs = new Map<string, HintRung>();
  let lastWrong: { id: string; text: string; category?: string } | null = null;
  let question: string | undefined;
  let kind: QuestionKind | undefined;

  // The last step above this one that was judged correct: that's what this line must follow from.
  const previousFor = (bbox: BBox): string | undefined => {
    const above = [...clusters.values()]
      .filter((c) => c.result?.status === "correct" && c.bbox.y + c.bbox.h <= bbox.y + bbox.h * 0.5)
      .sort((a, b) => b.bbox.y - a.bbox.y);
    return above[0]?.result?.text;
  };

  const judge = async (id: string, imagePng: string) => {
    const c = clusters.get(id);
    if (!c) return;
    const version = c.version;
    let r: JudgeResult;
    try {
      const res = await fetch("/api/step", {
        method: "POST",
        headers: { "content-type": "application/json", "x-session-id": getSessionId() },
        body: JSON.stringify({ clusterId: id, imagePng, question, kind, previous: previousFor(c.bbox), categories }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? `HTTP ${res.status}`);
      r = json as JudgeResult;
    } catch (e) {
      const error = e instanceof Error ? e.message : String(e);
      console.warn(`[brain] step check failed for ${id}: ${error}`);
      debug.onResult?.(id, { error });
      return;
    }
    // Drop stale answers: the cluster changed or vanished while the call was in flight.
    const now = clusters.get(id);
    if (!now || now.version !== version) {
      clientLog("verdict.stale_dropped", { clusterId: id, text: r.text, status: r.status });
      return;
    }
    // Never scold mid-writing: hold a "wrong" until the pen has been still for 2.5 s, then re-check
    // that the cluster didn't change meanwhile (if it did, the new version gets judged instead).
    if (r.status === "wrong") {
      await waitForQuietPen(2500);
      const still = clusters.get(id);
      if (!still || still.version !== version) {
        clientLog("verdict.wrong_dropped_kept_writing", { clusterId: id, text: r.text });
        return;
      }
    }
    now.result = r;
    debug.onResult?.(id, r);

    let category: string | undefined;
    let categoryIsNew = false;
    let repeatCount = 0;
    if (r.status === "wrong") {
      category = r.category;
      if (category && !categories.some((k) => k.id === category)) {
        categories.push({ id: category, label: r.newCategoryLabel ?? category, seed: false });
        categoryIsNew = true;
      }
      if (category) {
        repeatCount = (categoryCounts.get(category) ?? 0) + 1;
        categoryCounts.set(category, repeatCount);
      }
    }
    const mark: MarkType = r.status === "correct" ? "tick" : r.status === "wrong" ? "circle" : "none";
    const verdict: Verdict = {
      clusterId: id,
      status: r.status,
      mark,
      text: r.text,
      category,
      categoryIsNew,
      repeatCount,
      hintRung: r.status === "wrong" ? climb(id) : 0,
      hint: r.status === "wrong" ? r.explanation : undefined,
      source: r.source,
    };
    if (r.status === "wrong") lastWrong = { id, text: r.text, category };
    else if (r.status === "correct") {
      rungs.delete(id);
      if (lastWrong?.id === id) lastWrong = null;
    }
    clientLog("verdict", { ...verdict });
    bus.emit("verdict", verdict);
  };

  const climb = (id: string): HintRung => {
    const next = Math.min(4, (rungs.get(id) ?? 0) + 1) as HintRung;
    rungs.set(id, next);
    return next;
  };

  const offs = [
    // "nahi aata" / "pata nahi" / "samajh nahi" on an open mistake → next rung, re-sent as a verdict.
    bus.on("userUtterance", ({ text }) => {
      if (!lastWrong || !/nahi\s*(aata|aati|pata)|pata\s*nahi|samajh\s*nahi|नहीं\s*(आता|आती|पता)|पता\s*नहीं|समझ\s*नहीं|don'?t know|no idea/i.test(text)) return;
      const rung = climb(lastWrong.id);
      clientLog("hint.stuck", { clusterId: lastWrong.id, rung, said: text });
      bus.emit("verdict", {
        clusterId: lastWrong.id,
        status: "wrong",
        mark: "circle",
        text: lastWrong.text,
        category: lastWrong.category,
        categoryIsNew: false,
        repeatCount: lastWrong.category ? (categoryCounts.get(lastWrong.category) ?? 1) : 0,
        hintRung: rung,
        source: "checker",
      });
    }),
    bus.on("questionConfirmed", (q) => {
      clientLog("question.confirmed", { ...q });
      rungs.clear();
      lastWrong = null;
      question = q.text;
      kind = q.kind;
    }),
    bus.on("clusterUpdated", ({ id, bbox, imagePng, strokeIds }) => {
      clientLog("cluster.updated", { id, bbox, strokes: strokeIds.length });
      const c = clusters.get(id) ?? { id, bbox, version: 0 };
      c.bbox = bbox;
      c.version++;
      c.result = undefined;
      clusters.set(id, c);
      void judge(id, imagePng);
    }),
    bus.on("clusterRemoved", ({ id }) => {
      clientLog("cluster.removed", { id });
      clusters.delete(id);
    }),
  ];
  return () => offs.forEach((off) => off());
}
