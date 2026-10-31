// The verdict rule, shared by the app (/api/step) and the benchmark so we
// benchmark exactly what we ship. PLAN.md §5:
//   - the checker wins whenever it can compute (no false alarms on arithmetic);
//   - benefit of the doubt across plausible readings of messy digits;
//   - word problems: the checker can confirm the arithmetic, but only the model
//     can judge the setup, so "arithmetic correct" never overrules "setup wrong".
import { checkReadings, normalize } from "../checker";
import type { QuestionKind, VerdictStatus } from "../types";

// Characters a child's handwriting can make look alike. An "alternative reading"
// only counts if it differs from the main reading by up to 2 of these swaps.
// This stops the model from smuggling a *corrected* step in as an alternative.
const CONFUSABLE: string[][] = [
  ["1", "7", "l", "i", "/"],
  ["4", "9", "y"],
  ["5", "s", "S"],
  ["0", "6", "o", "O"],
  ["3", "8"],
  ["2", "z", "Z"],
  ["x", "*", "×"],
  [".", "*", "·"],
  ["+", "t"],
];
const sameGroup = (a: string, b: string) => CONFUSABLE.some((g) => g.includes(a) && g.includes(b));

export function plausibleAlternatives(text: string, alternatives: string[]): string[] {
  const base = normalize(text).replace(/\s+/g, "");
  return alternatives.filter((alt) => {
    const a = normalize(alt).replace(/\s+/g, "");
    if (a === base || a.length !== base.length) return false;
    let diffs = 0;
    for (let i = 0; i < a.length; i++) {
      if (a[i] === base[i]) continue;
      if (!sameGroup(a[i], base[i]) || ++diffs > 2) return false;
    }
    return true;
  });
}

export interface DecideInput {
  text: string;
  alternatives: string[];
  modelVerdict?: VerdictStatus;
  question?: string;
  previous?: string;
  kind?: QuestionKind;
}

export interface Decision {
  status: VerdictStatus;
  source: "model" | "checker";
  reason: string;
  usedAlternatives: string[];
}

export function decide(input: DecideInput): Decision {
  const modelVerdict = input.modelVerdict ?? "unsure";
  const usedAlternatives = plausibleAlternatives(input.text, input.alternatives);
  if (!input.text) return { status: "unsure", source: "model", reason: "nothing_read", usedAlternatives };

  // A half-written line ("3/4" of "3/4 + 1/6", or ending in an operator) is not a mistake yet.
  const t = normalize(input.text).replace(/\s+/g, "");
  const q = normalize(input.question ?? "").replace(/\s+/g, "");
  if (!t.includes("=") && ((q && q.startsWith(t) && t !== q) || /[-+*/(]$/.test(t))) {
    return { status: "unsure", source: "checker", reason: "incomplete_line", usedAlternatives };
  }
  if (/=$/.test(t)) return { status: "unsure", source: "checker", reason: "incomplete_line", usedAlternatives };

  // Word problems: the question is prose, so the checker only sees the line itself.
  const ctx = input.kind === "word_problem" ? { previous: input.previous } : { question: input.question, previous: input.previous };
  const check = checkReadings([input.text, ...usedAlternatives], ctx);

  if (check.status === "unknown") {
    // Chains and equations are always computable when read right, so "can't compute" means a
    // garbled reading (e.g. a messy 4 read as "y = y"). Never scold on that: stay unsure.
    // Word problems and other kinds fall back to the model's judgement.
    const computable = input.kind === undefined || input.kind === "chain" || input.kind === "equation";
    if (computable && modelVerdict === "wrong") return { status: "unsure", source: "model", reason: `checker_${check.reason}_model_wrong`, usedAlternatives };
    return { status: modelVerdict, source: "model", reason: `checker_${check.reason}`, usedAlternatives };
  }
  if (input.kind === "word_problem" && check.status === "correct" && modelVerdict === "wrong") {
    return { status: "wrong", source: "model", reason: "setup_wrong_arithmetic_ok", usedAlternatives };
  }
  return { status: check.status, source: "checker", reason: check.reason, usedAlternatives };
}
