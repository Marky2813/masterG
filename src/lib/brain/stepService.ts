"use client";

// Brain, client side: turns each clusterUpdated into a verdict on the bus.
// Reading order is top to bottom; a step is judged against the confirmed
// question and the nearest correct step above it. PLAN.md §5.
import { bus } from "../bus";
import { SEED_CATEGORIES } from "../categories";
import type { BBox, ErrorCategory, MarkType, Verdict } from "../types";
import type { JudgeResult } from "../gemini/judge";

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
  let question: string | undefined;

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
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ imagePng, question, previous: previousFor(c.bbox), categories }),
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
    if (!now || now.version !== version) return;
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
      hintRung: r.status === "wrong" ? 1 : 0, // the full hint ladder lands with mistake memory (#15)
      hint: r.status === "wrong" ? r.explanation : undefined,
      source: r.source,
    };
    bus.emit("verdict", verdict);
  };

  const offs = [
    bus.on("questionConfirmed", ({ text }) => {
      question = text;
    }),
    bus.on("clusterUpdated", ({ id, bbox, imagePng }) => {
      const c = clusters.get(id) ?? { id, bbox, version: 0 };
      c.bbox = bbox;
      c.version++;
      c.result = undefined;
      clusters.set(id, c);
      void judge(id, imagePng);
    }),
    bus.on("clusterRemoved", ({ id }) => {
      clusters.delete(id);
    }),
  ];
  return () => offs.forEach((off) => off());
}
