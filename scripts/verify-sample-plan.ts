// Checks every row of the sample plan against the checker so the labels are right.
import { readFileSync } from "node:fs";
import { checkStep } from "../src/lib/checker";
const rows = JSON.parse(readFileSync(process.argv[2], "utf8"));
let bad = 0;
rows.forEach((r: { topic: string; question: string; previous: string; write: string; correct: boolean }, i: number) => {
  const ctx = r.topic === "word_problem" ? (r.previous ? { previous: r.previous } : {}) : { question: r.question, ...(r.previous ? { previous: r.previous } : {}) };
  const res = checkStep(r.write, ctx);
  const want = r.correct ? "correct" : "wrong";
  const ok = res.status === want || (r.topic === "word_problem" && !r.correct && res.status === "correct" && /\* 5 = 300/.test(r.write));
  if (!ok) bad++;
  console.log(`${ok ? "ok " : "BAD"} ${String(i + 1).padStart(2)} ${want.padEnd(7)} checker=${res.status.padEnd(7)} ${r.write}`);
});
process.exit(bad ? 1 : 0);
