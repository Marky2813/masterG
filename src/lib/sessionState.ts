"use client";

// Session facts that late joiners need (e.g. Masterji started after the question was set).
import { bus } from "./bus";
import type { HomeworkRef, QuestionKind } from "./types";
import { isSimplified, reachesFinalAnswer } from "./brain/facts";

export const sessionState: { question: { text: string; kind: QuestionKind } | null } = { question: null };

bus.on("questionConfirmed", (q) => {
  sessionState.question = q;
});

// ---- Homework from the teacher: a worksheet read by /api/worksheet, done in order ----
// QuestionBox loads it and shows the queue; Masterji (voiceService) takes the next sum from it.

export interface HomeworkItem {
  text: string;
  kind: QuestionKind;
  label?: string; // number printed on the sheet, e.g. "2(b)"
}
export interface Homework {
  id: string;
  title?: string;
  items: HomeworkItem[];
  current: number | null; // index of the question on the board, null if it isn't from the homework
  done: number[]; // indices whose final answer was checked correct
}

let homework: Homework | null = null; // replaced (never mutated) so React can subscribe to it
const listeners = new Set<() => void>();
const setHomework = (h: Homework | null) => {
  homework = h;
  listeners.forEach((l) => l());
};

export const getHomework = () => homework;
export function subscribeHomework(cb: () => void): () => void {
  listeners.add(cb);
  return () => listeners.delete(cb);
}
export function loadHomework(items: HomeworkItem[], title?: string): Homework {
  const h: Homework = { id: `hw-${Date.now().toString(36)}`, title, items, current: null, done: [] };
  setHomework(h);
  return h;
}
export const clearHomework = () => setHomework(null);

export function homeworkRef(index: number): HomeworkRef | undefined {
  return homework ? { id: homework.id, index, total: homework.items.length, ...(homework.title ? { title: homework.title } : {}) } : undefined;
}

// The next homework question to do: the first not-done one after the current, else any earlier
// one still not done. Never the current one. Null when nothing is left.
export function nextHomework(): { index: number; item: HomeworkItem; total: number } | null {
  if (!homework) return null;
  const h = homework;
  const from = h.current ?? -1;
  const order = [...h.items.keys()].sort((a, b) => ((a <= from ? 1 : 0) - (b <= from ? 1 : 0)) || a - b);
  const index = order.find((i) => i !== h.current && !h.done.includes(i));
  return index === undefined ? null : { index, item: h.items[index], total: h.items.length };
}

bus.on("questionConfirmed", (q) => {
  if (!homework) return;
  const current = q.homework?.id === homework.id ? q.homework.index : null;
  if (current !== homework.current) setHomework({ ...homework, current });
});

// Same rule as Masterji's FINAL ANSWER CORRECT note: the final answer, fully simplified.
bus.on("verdict", (v) => {
  const h = homework;
  if (!h || h.current === null || v.status !== "correct" || h.done.includes(h.current)) return;
  const q = h.items[h.current].text;
  if (reachesFinalAnswer(q, v.text) && isSimplified(v.text)) setHomework({ ...h, done: [...h.done, h.current] });
});
