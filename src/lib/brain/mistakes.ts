// Mistakes code can name for sure, so a teacher's report never depends on Flash's guess for them.
// Used only on a step already judged wrong; it changes the label, never the verdict.

const FRAC_Q = /^\s*(\d+)\s*\/\s*(\d+)\s*([+-])\s*(\d+)\s*\/\s*(\d+)\s*$/;

// "a/b + c/d" answered with (a+c)/(b+d) (or the same value, e.g. 2/5 for 4/10): added across.
// Same for subtraction: (a-c)/(b-d).
export function knownMistake(question: string, line: string): string | undefined {
  const q = question.replace(/−/g, "-").match(FRAC_Q);
  if (!q) return undefined;
  const [a, b, c, d] = [q[1], q[2], q[4], q[5]].map(Number);
  const plus = q[3] === "+";
  const n = plus ? a + c : a - c;
  const den = plus ? b + d : b - d;
  if (den === 0) return undefined;
  const last = line.replace(/\s+/g, "").split("=").pop() ?? "";
  const m = last.match(/^(-?\d+)\/(\d+)$/);
  if (!m || Number(m[2]) === 0) return undefined;
  const right = plus ? a / b + c / d : a / b - c / d;
  const said = Number(m[1]) / Number(m[2]);
  if (Math.abs(said - right) < 1e-9) return undefined; // it is the answer, not a mistake
  return Math.abs(said - n / den) < 1e-9 ? "add_across" : undefined;
}
