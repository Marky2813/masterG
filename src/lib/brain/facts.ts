// Correct, computed facts about the question for Masterji to write on the board.
// The voice model must never do maths itself (PLAN.md §5); it copies from these.
import { referenceAnswer, normalize } from "../checker";

const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b));
const lcm = (a: number, b: number) => (a * b) / gcd(a, b);

export function questionFacts(question: string): string[] {
  const facts: string[] = [];
  const ans = referenceAnswer(question);
  if (ans) facts.push(ans.kind === "value" ? `final answer: ${question} = ${ans.text}` : `solution: ${ans.text}`);

  // Sum/difference of simple fractions: LCM and the equivalent fractions (the usual working).
  const q = normalize(question).replace(/\s+/g, "");
  const m = q.match(/^(\d+)\/(\d+)([+-])(\d+)\/(\d+)$/);
  if (m) {
    const [, a, b, op, c, d] = m;
    const [n1, d1, n2, d2] = [a, b, c, d].map(Number);
    if (d1 !== d2) {
      const L = lcm(d1, d2);
      const e1 = n1 * (L / d1),
        e2 = n2 * (L / d2);
      facts.push(`LCM(${d1}, ${d2}) = ${L}`);
      facts.push(`${n1}/${d1} = ${e1}/${L}`, `${n2}/${d2} = ${e2}/${L}`);
      facts.push(`working: ${n1}/${d1} ${op} ${n2}/${d2} = ${e1}/${L} ${op} ${e2}/${L} = ${op === "+" ? e1 + e2 : e1 - e2}/${L}`);
    }
  }
  // Linear equation: the usual first move.
  const eqm = q.match(/^(\d*)([a-z])([+-])(\d+)=(\d+)$/);
  if (eqm) {
    const [, k, v, op, b, c] = eqm;
    const moved = op === "+" ? Number(c) - Number(b) : Number(c) + Number(b);
    facts.push(`step: ${k || ""}${v} = ${c} ${op === "+" ? "-" : "+"} ${b} = ${moved}`);
  }
  // Linear equation in one variable: the graph Masterji can draw (both sides as lines, the crossing).
  const sides = q.split("=");
  if (sides.length === 2 && ans?.kind === "equation") {
    const v = ans.text.split("=")[0].trim();
    const xv = Number(ans.text.split("=")[1]);
    if (/^[a-z]$/.test(v) && Number.isFinite(xv)) {
      const show = (e: string) => e.replace(/\*/g, "").replace(new RegExp(v, "g"), "x");
      facts.push(`graph: draw y = ${show(sides[0])} and y = ${show(sides[1])}; they cross at x = ${xv} (that's the answer ${v} = ${xv})`);
    }
  }
  return facts;
}

// True when a correct line ends in the question's final answer written as a single number or
// fraction ("11/12", "= 11/12", "9/12 + 2/12 = 11/12"), not an intermediate expression.
export function reachesFinalAnswer(question: string, line: string): boolean {
  const ans = referenceAnswer(question);
  if (!ans || ans.kind !== "value") return false;
  const last = normalize(line).split("=").pop()?.replace(/\s+/g, "") ?? "";
  if (!/^-?\d+(\/\d+)?$/.test(last)) return false;
  const [n, d = "1"] = last.replace("-", "").split("/");
  const [an, ad = "1"] = ans.text.replace("-", "").split("/");
  const neg = last.startsWith("-") !== ans.text.startsWith("-");
  return !neg && Number(n) * Number(ad) === Number(an) * Number(d);
}

// "44/42" isn't in lowest terms; "22/21" and "5" are.
export function isSimplified(line: string): boolean {
  const last = normalize(line).split("=").pop()?.replace(/\s+/g, "") ?? "";
  const m = last.match(/^-?(\d+)\/(\d+)$/);
  return !m || gcd(Number(m[1]), Number(m[2])) === 1;
}

export function simplestAnswer(question: string): string | null {
  const ans = referenceAnswer(question);
  return ans?.kind === "value" ? ans.text : null;
}
