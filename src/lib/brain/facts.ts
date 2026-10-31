// Correct, computed facts about the question for Masterji to write on the board.
// The voice model must never do maths itself (PLAN.md §5); it copies from these.
import { referenceAnswer, normalize } from "../checker";

const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b));
const lcm = (a: number, b: number) => (a * b) / gcd(a, b);

export function questionFacts(question: string): string[] {
  const facts: string[] = [];
  const ans = referenceAnswer(question);
  // Labelled secret: he had it in FACTS and wrote "2 + 3 = 5" on the board at rung 2 (log 20-06-47).
  const secret = "(secret until the child writes it or rung 4)";
  if (ans) facts.push(ans.kind === "value" ? `final answer ${secret}: ${question} = ${ans.text}` : `solution ${secret}: ${ans.text}`);

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

// ---------- answer guard: Masterji must not hand over the answer before the child gets there ----------

const num = (s: string): number | null => {
  const m = s.replace(/\s+/g, "").match(/^(-?\d+(?:\.\d+)?)(?:\/(\d+))?$/);
  return m ? Number(m[1]) / (m[2] ? Number(m[2]) : 1) : null;
};

// The final answer as a number: "11/12" for 3/4 + 1/6, 5 for 3x + 5 = 20. Null when there's no single one.
function answerValue(question: string): number | null {
  const ans = referenceAnswer(question);
  if (!ans) return null;
  return num(ans.kind === "value" ? ans.text : (ans.text.split("=")[1] ?? ""));
}

// True when a board line (or a hint) states the question's final answer: "2 + 3 = 5", "x = 15/3 = 5",
// "9/12 + 2/12 = 11/12", "Final answer = 7", "Total 7 lines!", "2 plus 3 is 5". Method lines that only
// pass through other numbers ("LCM(4, 6) = 12", "3/4 = 9/12", "3x = 20 - 5 = 15") don't.
export function revealsAnswer(question: string, text: string): boolean {
  const a = answerValue(question);
  if (a === null) return false;
  const same = (s: string) => {
    const n = num(s.replace(/^[\s(]+|[\s).!?,;:]+$/g, ""));
    return n !== null && Math.abs(n - a) < 1e-9;
  };
  // The question itself on the board isn't a give-away ("2x - 5 = 5" has answer 5 on its right side).
  const q = normalize(question).replace(/\s+/g, "").split("").map((c) => c.replace(/[.*+?^${}()|[\]\\/]/, "\\$&")).join("\\s*");
  let t = normalize(text).replace(new RegExp(q, "g"), " ");
  t = t.replace(/\b(is|equals|hai|hota hai|hoga|should be|comes to)\b/gi, "=");
  const segs = t.split("=").slice(1).map((s) => s.split(/[,;]|\s(?:and|aur|not|nahi)\s/i)[0]);
  if (segs.some(same)) return true;
  for (const m of t.matchAll(/\b(?:answer|ans|total|jawab|uttar|result)\b[^\d-]{0,14}(-?\d+(?:\/\d+)?)/gi)) if (same(m[1])) return true;
  return false;
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
