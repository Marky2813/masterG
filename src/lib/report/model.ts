// Teacher / parent report: the data model and the pure logic around it (no bus, no DOM).
// Everything here is computed from real session events captured by recorder.ts; nothing is
// sample data. Keys are short because the whole report travels in the share link (#r=...).
import { SEED_CATEGORIES } from "../categories";
import { normalize, referenceAnswer } from "../checker";
import { isSimplified, reachesFinalAnswer } from "../brain/facts";
import type { QuestionKind } from "../types";

export type StepStatus = "c" | "w" | "u"; // correct / wrong / unsure

export interface ReportStep {
  id: string; // cluster id (local only, for de-duplication)
  t: string; // what Flash read, mathjs syntax
  s: StepStatus; // the latest verdict on this step
  w?: 1; // was judged wrong at some point (even if fixed later)
  c?: string; // mistake category id (latest wrong verdict)
  l?: string; // mistake category label
  r?: number; // highest hint rung reached on this step (1 point … 4 show)
  h?: string; // handwriting remark, only when Flash rated the crop "messy"
  x?: 1; // erased by the kid after it was judged
  y: number; // top of the cluster on the page, for reading order
  a: number; // ms after the question started that this step was first judged
}

export interface ReportQuestion {
  q: string; // the question text
  k: QuestionKind;
  t0: number; // epoch ms when the question was set
  t1: number; // epoch ms of the last event on this question
  st: ReportStep[];
  n?: number; // times the kid said "nahi aata" / "samajh nahi" / "pata nahi" while on this question
  m?: { l?: number; g?: number; s?: number; n?: number }; // Masterji wrote: working lines, graphs, counting sticks, margin notes
  hw?: { i: number; n: number; ti?: string }; // homework position, if the question came from a homework queue
}

export interface AiSuggestion {
  q: string; // a practice question (mathjs syntax when it is a sum)
  why: string; // which weak spot it targets
  a?: string; // answer computed by our checker (never by the model)
}

export interface AiSummary {
  lacking: string;
  next: string;
  qs: AiSuggestion[];
  model: string;
}

export interface Report {
  v: 1;
  t0: number; // session start (epoch ms)
  t1: number; // last event (epoch ms)
  nm?: string; // kid's name (typed on the report page)
  cl?: string; // class (typed on the report page)
  qs: ReportQuestion[];
  ai?: AiSummary;
}

// ---------- derived facts ----------

export type Outcome = "first_try" | "fixed" | "helped" | "unfinished" | "unchecked";

export const OUTCOME_LABEL: Record<Outcome, string> = {
  first_try: "Solved first try",
  fixed: "Solved after fixing a mistake",
  helped: "Solved with Masterji's help",
  unfinished: "Not finished",
  unchecked: "Practised (answer not auto-checked)",
};

// True when a correct line is the question's final answer in its simplest form:
// "11/12" for a sum, "x = 5" for an equation. Same rule Masterji uses for FINAL ANSWER CORRECT.
export function isFinalLine(question: string, line: string): boolean {
  const ref = referenceAnswer(question);
  if (!ref) return false;
  if (ref.kind === "value") return reachesFinalAnswer(question, line) && isSimplified(line);
  // Equation: the last statement must be "x = <the value>" ("3x = 15, x = 5", "x = 15/3 = 5"), not "2x = 5".
  const [v, val] = ref.text.replace(/\s+/g, "").split("=");
  const last = normalize(line).replace(/\s+/g, "").split(/[,;]/).pop() ?? "";
  const m = last.match(/^([a-z])=(.*)$/);
  return !!m && m[1] === v && /^-?\d+(\/\d+)?$/.test(m[2].split("=").pop() ?? "") && sameValue(m[2].split("=").pop()!, val) && isSimplified(last);
}

function sameValue(a: string, b: string): boolean {
  const num = (s: string) => {
    const [n, d = "1"] = s.split("/");
    return Number(n) / Number(d);
  };
  return Number.isFinite(num(a)) && Math.abs(num(a) - num(b)) < 1e-9;
}

export const visibleSteps = (q: ReportQuestion) => [...q.st].sort((a, b) => a.y - b.y || a.a - b.a);
export const taughtMethod = (q: ReportQuestion) => !!(q.m && ((q.m.l ?? 0) > 0 || (q.m.g ?? 0) > 0 || (q.m.s ?? 0) > 0));
export const maxRung = (q: ReportQuestion) => q.st.reduce((m, s) => Math.max(m, s.r ?? 0), 0);
export const hadMistake = (q: ReportQuestion) => q.st.some((s) => s.w);

export function outcomeOf(q: ReportQuestion): Outcome {
  if (!referenceAnswer(q.q)) return "unchecked";
  const solved = q.st.some((s) => s.s === "c" && !s.x && isFinalLine(q.q, s.t));
  if (!solved) return "unfinished";
  if (hadMistake(q) || (q.n ?? 0) > 0) return "fixed";
  if (taughtMethod(q)) return "helped";
  return "first_try";
}

export function topicOf(q: string, kind: QuestionKind): string {
  const s = q.toLowerCase();
  if (kind === "word_problem") return "Word problems";
  if (/\blcm\b|\bhcf\b|\bgcd\b/.test(s)) return "LCM / HCF";
  if (kind === "equation" || (/=/.test(s) && /[a-z]/.test(s))) return "Linear equations";
  if (/\d\.\d/.test(s)) return "Decimals";
  if (/\d\s*\/\s*\d/.test(s)) return /[+-]/.test(s) ? "Adding / subtracting fractions" : "Fractions";
  if (/\^/.test(s)) return "Exponents";
  if (/\(/.test(s) || (/[+-]/.test(s) && /[*/]/.test(s))) return "BODMAS";
  if (/[*×]/.test(s)) return "Multiplication";
  if (/÷/.test(s) || /\d\s*\/\s*\d/.test(s)) return "Division";
  if (/-/.test(s)) return "Subtraction";
  if (/\+/.test(s)) return "Addition";
  return "Other";
}

export function categoryLabel(id: string, carried?: string): string {
  return SEED_CATEGORIES.find((c) => c.id === id)?.label || carried || id.replace(/_/g, " ");
}

export interface MistakeGroup {
  id: string;
  label: string;
  count: number; // how many steps had this mistake
  questions: string[]; // which questions it showed up in
  fixed: number; // how many of those were put right later (the step itself, or the question got solved)
}

export interface ReportSummary {
  attempted: number;
  solved: number;
  firstTry: number;
  checkable: number; // questions whose answer the checker can verify (the first-try rate is over these)
  firstTryRate: number | null; // 0..1, null when nothing was checkable
  steps: number;
  correctSteps: number;
  wrongSteps: number;
  stuck: number; // total "nahi aata"
  taught: number; // questions where Masterji showed the method
  messy: number; // steps with a messy-handwriting remark
  durationMs: number;
  mistakes: MistakeGroup[]; // most frequent first
  strengths: { topic: string; solved: number }[]; // topics solved with no mistake and no help
  weakTopics: { topic: string; mistakes: number }[];
  outcomes: Outcome[]; // per question, same order as report.qs
}

export function summarize(r: Report): ReportSummary {
  const outcomes = r.qs.map(outcomeOf);
  const groups = new Map<string, MistakeGroup>();
  const clean = new Map<string, number>();
  const weak = new Map<string, number>();
  let steps = 0,
    correctSteps = 0,
    wrongSteps = 0,
    messy = 0;
  r.qs.forEach((q, i) => {
    const topic = topicOf(q.q, q.k);
    for (const s of q.st) {
      steps++;
      if (s.s === "c") correctSteps++;
      if (s.w) {
        wrongSteps++;
        weak.set(topic, (weak.get(topic) ?? 0) + 1);
      }
      if (s.h) messy++;
      if (s.w && s.c) {
        const g = groups.get(s.c) ?? { id: s.c, label: categoryLabel(s.c, s.l), count: 0, questions: [], fixed: 0 };
        g.count++;
        if (s.s === "c" || ["first_try", "fixed", "helped"].includes(outcomes[i])) g.fixed++;
        if (!g.questions.includes(q.q)) g.questions.push(q.q);
        groups.set(s.c, g);
      }
    }
    if (outcomes[i] === "first_try") clean.set(topic, (clean.get(topic) ?? 0) + 1);
  });
  const checkable = outcomes.filter((o) => o !== "unchecked").length;
  const firstTry = outcomes.filter((o) => o === "first_try").length;
  return {
    attempted: r.qs.length,
    solved: outcomes.filter((o) => o === "first_try" || o === "fixed" || o === "helped").length,
    firstTry,
    checkable,
    firstTryRate: checkable ? firstTry / checkable : null,
    steps,
    correctSteps,
    wrongSteps,
    stuck: r.qs.reduce((n, q) => n + (q.n ?? 0), 0),
    taught: r.qs.filter(taughtMethod).length,
    messy,
    durationMs: Math.max(0, r.t1 - r.t0),
    mistakes: [...groups.values()].sort((a, b) => b.count - a.count || a.label.localeCompare(b.label)),
    strengths: [...clean.entries()].filter(([t]) => !weak.has(t)).map(([topic, solved]) => ({ topic, solved })),
    weakTopics: [...weak.entries()].map(([topic, mistakes]) => ({ topic, mistakes })).sort((a, b) => b.mistakes - a.mistakes),
    outcomes,
  };
}

export function formatDuration(ms: number): string {
  const s = Math.round(ms / 1000);
  if (s < 60) return `${s} s`;
  const m = Math.round(s / 60);
  if (m < 60) return `${m} min`;
  return `${Math.floor(m / 60)} h ${m % 60} min`;
}

// ---------- share link: JSON → deflate-raw → base64url, in the URL fragment ----------

const toB64Url = (bytes: Uint8Array) => {
  let bin = "";
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
};
const fromB64Url = (s: string) => {
  const bin = atob(s.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((s.length + 3) % 4));
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
};

async function pipe(bytes: Uint8Array, stream: CompressionStream | DecompressionStream): Promise<Uint8Array> {
  const blob = new Blob([bytes as BlobPart]);
  const res = new Response(blob.stream().pipeThrough(stream));
  return new Uint8Array(await res.arrayBuffer());
}

// Cluster ids are local-only: they stay out of the link (and the AI prompt).
export const dropIds = (k: string, v: unknown) => (k === "id" ? undefined : v);

export async function encodeReport(r: Report): Promise<string> {
  const json = JSON.stringify(r, dropIds);
  return toB64Url(await pipe(new TextEncoder().encode(json), new CompressionStream("deflate-raw")));
}

export async function decodeReport(data: string): Promise<Report> {
  const json = new TextDecoder().decode(await pipe(fromB64Url(data), new DecompressionStream("deflate-raw")));
  return parseReport(JSON.parse(json));
}

// Accepts anything that looks like a report and fills in what a shorter link may leave out.
// Throws on data that isn't a report, so a broken link shows an error, never made-up content.
export function parseReport(x: unknown): Report {
  const o = x as Partial<Report> | null;
  if (!o || o.v !== 1 || !Array.isArray(o.qs) || typeof o.t0 !== "number") throw new Error("not a MasterG report");
  return {
    v: 1,
    t0: o.t0,
    t1: typeof o.t1 === "number" ? o.t1 : o.t0,
    nm: typeof o.nm === "string" ? o.nm.slice(0, 60) : undefined,
    cl: typeof o.cl === "string" ? o.cl.slice(0, 20) : undefined,
    qs: o.qs.map((q) => ({
      ...q,
      q: String(q.q ?? ""),
      st: (Array.isArray(q.st) ? q.st : []).map((s) => ({ ...s, id: s.id ?? "", t: String(s.t ?? ""), y: s.y ?? 0, a: s.a ?? 0 })),
    })),
    ai: o.ai && typeof o.ai.lacking === "string" && Array.isArray(o.ai.qs) ? o.ai : undefined,
  };
}
