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
  facts.push(...methodFacts(question));
  // Small + / - (Classes 1-2): teach by counting sticks on the board.
  const sm = q.match(/^(\d{1,2})([+-])(\d{1,2})$/);
  if (sm && Number(sm[1]) <= 10 && Number(sm[3]) <= 10 && (sm[2] === "+" || Number(sm[1]) >= Number(sm[3])))
    facts.push(`counting: if they're stuck, draw sticks with the counting tool (a ${sm[1]}, b ${sm[3]}, op ${sm[2]}) and count aloud with it`);
  // Linear equation: the usual first move.
  const eqm = q.match(/^(\d*)([a-z])([+-])(\d+)=(\d+)$/);
  if (eqm) {
    const [, k, v, op, b, c] = eqm;
    const moved = op === "+" ? Number(c) - Number(b) : Number(c) + Number(b);
    facts.push(`step: ${k || ""}${v} = ${c} ${op === "+" ? "-" : "+"} ${b} = ${moved}`);
    if (k && Number(k) > 1) facts.push(`step: ${v} = ${moved}/${k} = ${moved / Number(k)}   [divide both sides by ${k}]`);
    facts.push(`why: moving ${b} to the other side of = changes ${op} into ${op === "+" ? "-" : "+"}`);
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

// ---------- methods: the HOW, computed, so Masterji can teach it step by step ----------

// LCM by listing multiples (Class 5 way) and by prime factors.
export function lcmMethod(a: number, b: number): string[] {
  const L = lcm(a, b);
  const mult = (n: number) => Array.from({ length: L / n }, (_, i) => n * (i + 1)).join(", ");
  const factors = (n: number) => {
    const f: number[] = [];
    for (let d = 2, m = n; m > 1; d++) {
      while (m % d === 0) {
        f.push(d);
        m /= d;
      }
    }
    return f;
  };
  const fa = factors(a),
    fb = factors(b);
  const merged: number[] = [];
  const rest = [...fb];
  for (const p of fa) {
    merged.push(p);
    const i = rest.indexOf(p);
    if (i >= 0) rest.splice(i, 1);
  }
  merged.push(...rest);
  return [
    `multiples of ${a}: ${mult(a)}`,
    `multiples of ${b}: ${mult(b)}`,
    `first common multiple = ${L}, so LCM(${a}, ${b}) = ${L}`,
    `(prime factors: ${a} = ${fa.join(" × ") || a}, ${b} = ${fb.join(" × ") || b}, LCM = ${merged.join(" × ")} = ${L})`,
  ];
}

// Making a fraction's denominator d: multiply top and bottom by d / den.
export function equivalentMethod(n: number, den: number, d: number): string {
  const k = d / den;
  return `${n}/${den} = (${n} × ${k})/(${den} × ${k}) = ${n * k}/${d}   [${d} ÷ ${den} = ${k}]`;
}

// Column multiplication, digit by digit with carries (small whole numbers).
export function multiplyMethod(a: number, b: number): string[] {
  if (!Number.isInteger(a) || !Number.isInteger(b) || a < 0 || b < 0 || a > 9999 || b > 99) return [];
  const one = (x: number, digit: number): string[] => {
    const steps: string[] = [];
    let carry = 0;
    const digits = String(x).split("").reverse().map(Number);
    digits.forEach((dg, i) => {
      const p = dg * digit + carry;
      const write = i === digits.length - 1 ? p : p % 10;
      steps.push(`${dg} × ${digit}${carry ? ` + ${carry} (carry)` : ""} = ${p}${i === digits.length - 1 ? "" : `: write ${write}, carry ${Math.floor(p / 10)}`}`);
      carry = Math.floor(p / 10);
    });
    return steps;
  };
  if (b < 10) return [`${a} × ${b}, from the right:`, ...one(a, b), `so ${a} × ${b} = ${a * b}`];
  const t = Math.floor(b / 10),
    u = b % 10;
  return [`${a} × ${b} = ${a} × ${u} + ${a} × ${t}0`, `${a} × ${u} = ${a * u}`, `${a} × ${t}0 = ${a * t * 10}`, `${a * u} + ${a * t * 10} = ${a * b}`];
}

// All method lines worth giving for a line of maths (question or a kid's step).
export function methodFacts(text: string): string[] {
  const q = normalize(text).replace(/\s+/g, "");
  const out: string[] = [];
  const fr = q.match(/^(\d+)\/(\d+)([+-])(\d+)\/(\d+)/);
  if (fr) {
    const [, a, b, , c, d] = fr;
    const [n1, d1, n2, d2] = [a, b, c, d].map(Number);
    if (d1 !== d2) {
      const L = lcm(d1, d2);
      out.push(...lcmMethod(d1, d2).map((l) => `LCM method: ${l}`));
      out.push(`convert: ${equivalentMethod(n1, d1, L)}`, `convert: ${equivalentMethod(n2, d2, L)}`);
    }
  }
  for (const m of q.matchAll(/(\d+)\*(\d+)/g)) {
    const steps = multiplyMethod(Number(m[1]), Number(m[2]));
    if (steps.length) out.push(...steps.map((l) => `multiply method: ${l}`));
  }
  const lc = q.match(/lcm\((\d+),(\d+)\)/);
  if (lc) out.push(...lcmMethod(Number(lc[1]), Number(lc[2])).map((l) => `LCM method: ${l}`));
  return out;
}
