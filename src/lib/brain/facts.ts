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
  return facts;
}
