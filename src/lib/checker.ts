import { all, create, type MathNode, type MathType } from "mathjs";

// Deterministic step checker. It never sees handwriting — it takes the text Flash
// read (mathjs syntax) and decides right/wrong exactly. See PLAN.md §5.
//
//   arithmetic line   "3/4 + 1/6 = 11/12"   all sides equal, and equal to the reference value
//   equation line     "3x = 20 - 5"         same solution as the reference equation
//   algebra line      "2x + 6"              identically equal to the reference expression
//
// "unknown" means the checker can't decide (unparseable, nonlinear, no reference) —
// callers fall back to the model's verdict.

const math = create(all, { number: "Fraction" });

export type CheckStatus = "correct" | "wrong" | "unknown";

export interface CheckResult {
  status: CheckStatus;
  reason: string;
}

export interface CheckContext {
  question?: string; // the confirmed question, in mathjs syntax (may contain "=" for equations)
  previous?: string; // the last accepted step, if any
}

const SAMPLE_POINTS = [
  [2, 7],
  [3, 5],
  [5, 3],
  [7, 11],
] as const;

export function normalize(text: string): string {
  return text
    .replace(/[×·∙]/g, "*")
    .replace(/÷/g, "/")
    .replace(/[−–—]/g, "-")
    .replace(/\bhcf\s*\(/gi, "gcd(")
    .replace(/\bgcd\s*\(/gi, "gcd(")
    .replace(/\blcm\s*\(/gi, "lcm(")
    .trim();
}

type Side = { node: MathNode; vars: string[] };

function parseSide(text: string): Side | null {
  try {
    const node = math.parse(text);
    const vars = new Set<string>();
    node.traverse((n, _path, parent) => {
      if (!("isSymbolNode" in n) || !n.isSymbolNode) return;
      const isCallee = (parent as { isFunctionNode?: boolean; fn?: MathNode } | null)?.fn === n;
      const name = (n as unknown as { name: string }).name;
      if (!isCallee && !(name in math)) vars.add(name);
    });
    return { node, vars: [...vars] };
  } catch {
    return null;
  }
}

function evalAt(side: Side, scope: Record<string, MathType>): MathType | null {
  try {
    return side.node.evaluate(scope) as MathType;
  } catch {
    return null;
  }
}

function eq(a: MathType | null, b: MathType | null): boolean {
  if (a === null || b === null) return false;
  try {
    return Boolean(math.equal(a, b));
  } catch {
    return false;
  }
}

function splitSides(line: string): { sides: string[]; continuesPrevious: boolean } {
  const parts = normalize(line).split("=").map((s) => s.trim());
  const continuesPrevious = parts[0] === "";
  return { sides: continuesPrevious ? parts.slice(1) : parts, continuesPrevious };
}

// What the line before (or the question) pins down, so the next line can be compared to it.
type Reference =
  | { kind: "value"; value: MathType }
  | { kind: "equation"; solution: MathType; variable: string }
  | { kind: "expr"; side: Side }
  | null;

function analyze(text: string | undefined): Reference {
  if (!text) return null;
  const { sides: raw } = splitSides(text);
  const sides = raw.map(parseSide);
  if (sides.some((s) => s === null) || sides.length === 0) return null;
  const parsed = sides as Side[];
  const vars = new Set(parsed.flatMap((s) => s.vars));

  if (vars.size === 0) {
    const value = evalAt(parsed[parsed.length - 1], {});
    return value === null ? null : { kind: "value", value };
  }
  if (parsed.length === 1) return { kind: "expr", side: parsed[0] };
  if (parsed.length === 2 && vars.size === 1) {
    const variable = [...vars][0];
    const solution = solveLinear(parsed[0], parsed[1], variable);
    return solution === null ? null : { kind: "equation", solution, variable };
  }
  // Multi-side algebra chain ("(a+b)^2 = a^2+2ab+b^2"): compare later lines to the last side.
  return { kind: "expr", side: parsed[parsed.length - 1] };
}

// For linear f(v) = lhs - rhs: v = -f(0) / (f(1) - f(0)). Returns null if not linear in v.
function solveLinear(lhs: Side, rhs: Side, v: string): MathType | null {
  const f = (x: number) => {
    const scope = { [v]: math.fraction(x) as MathType };
    const l = evalAt(lhs, scope);
    const r = evalAt(rhs, scope);
    return l === null || r === null ? null : (math.subtract(l, r) as MathType);
  };
  const [f0, f1, f2] = [f(0), f(1), f(2)];
  if (f0 === null || f1 === null || f2 === null) return null;
  const slope = math.subtract(f1, f0) as MathType;
  if (!eq(math.subtract(f2, f1) as MathType, slope)) return null; // nonlinear
  if (eq(slope, math.fraction(0) as MathType)) return null; // no unique solution
  return math.divide(math.unaryMinus(f0), slope) as MathType;
}

function identicallyEqual(a: Side, b: Side, vars: string[]): boolean {
  return SAMPLE_POINTS.every(([n, d], i) => {
    const scope: Record<string, MathType> = {};
    vars.forEach((v, j) => {
      const [pn, pd] = SAMPLE_POINTS[(i + j) % SAMPLE_POINTS.length];
      scope[v] = math.fraction(j === 0 ? n : pn, j === 0 ? d : pd) as MathType;
    });
    return eq(evalAt(a, scope), evalAt(b, scope));
  });
}

export function checkStep(line: string, ctx: CheckContext = {}): CheckResult {
  const refText = ctx.previous ?? ctx.question;
  const ref = analyze(refText);
  const { sides: raw, continuesPrevious } = splitSides(line);
  if (raw.length === 0 || raw.some((s) => s === "")) return { status: "unknown", reason: "empty_side" };

  const sides = raw.map(parseSide);
  if (sides.some((s) => s === null)) return { status: "unknown", reason: "unparseable" };
  const parsed = sides as Side[];
  const vars = [...new Set(parsed.flatMap((s) => s.vars))];

  // Pure arithmetic: every side must have the same value, and match the reference value.
  if (vars.length === 0) {
    const values = parsed.map((s) => evalAt(s, {}));
    if (values.some((v) => v === null)) return { status: "unknown", reason: "eval_failed" };
    if (!values.every((v) => eq(v, values[0]))) return { status: "wrong", reason: "sides_unequal" };
    if (ref?.kind === "value" && !eq(values[0], ref.value)) {
      return { status: "wrong", reason: "differs_from_previous" };
    }
    if (!ref && parsed.length === 1 && continuesPrevious) return { status: "unknown", reason: "no_reference" };
    return { status: "correct", reason: ref ? "matches_reference" : "sides_equal" };
  }

  // Algebra simplification: each side must be identically equal to the reference expression.
  if (ref?.kind === "expr") {
    const ok = parsed.every((s) => identicallyEqual(s, ref.side, [...new Set([...vars, ...ref.side.vars])]));
    return ok ? { status: "correct", reason: "identity_holds" } : { status: "wrong", reason: "not_identical" };
  }

  // Linear equation: must have the same solution as the reference equation.
  if (parsed.length === 2 && vars.length === 1) {
    const solution = solveLinear(parsed[0], parsed[1], vars[0]);
    if (solution === null) return { status: "unknown", reason: "not_linear" };
    if (ref?.kind !== "equation" || ref.variable !== vars[0]) return { status: "unknown", reason: "no_reference" };
    return eq(solution, ref.solution)
      ? { status: "correct", reason: "same_solution" }
      : { status: "wrong", reason: "solution_changed" };
  }

  return { status: "unknown", reason: "unsupported_shape" };
}

// Benefit of the doubt: if any plausible reading makes the step correct, it's correct.
// Only if every reading is wrong is it wrong.
export function checkReadings(readings: string[], ctx: CheckContext = {}): CheckResult {
  const results = readings.filter(Boolean).map((r) => checkStep(r, ctx));
  if (results.length === 0) return { status: "unknown", reason: "no_readings" };
  const correct = results.find((r) => r.status === "correct");
  if (correct) return correct;
  if (results.every((r) => r.status === "wrong")) return results[0];
  return { status: "unknown", reason: "mixed" };
}
