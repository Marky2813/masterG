// Re-apply the current verdict rule to a saved benchmark run, offline (no API calls):
// node --import tsx scripts/redecide.ts benchmark/results/<run>.json
// Uses config A's reading + model verdict (alternatives aren't saved, so this is a lower bound on benefit of the doubt).
import { readFileSync } from "node:fs";
import { decide } from "../src/lib/brain/decide";
type Row = { config: string; sampleId: string; read?: string; predicted: string; expectedCorrect: boolean; ms: number; error?: string };
const rows: Row[] = (() => { const d = JSON.parse(readFileSync(process.argv[2], "utf8")); return Array.isArray(d) ? d : d.rows; })();
const labels = new Map(JSON.parse(readFileSync("benchmark/samples/labels.json", "utf8")).map((l: { id: string }) => [l.id, l]));
let right = 0, fa = 0, missed = 0, unsure = 0, n = 0;
for (const r of rows.filter((r) => r.config === "A" && !r.error)) {
  const l = labels.get(r.sampleId) as { question?: string; previous?: string; topic: string; isCorrect: boolean; expectedText: string };
  const d = decide({ text: r.read ?? "", alternatives: [], modelVerdict: r.predicted as never, question: l.question, previous: l.previous, kind: l.topic === "word_problem" ? "word_problem" : undefined });
  n++;
  if (d.status === "unsure") unsure++;
  else if ((d.status === "correct") === l.isCorrect) right++;
  else if (d.status === "wrong") { fa++; console.log(`FALSE ALARM ${r.sampleId}: read '${r.read}'`); }
  else { missed++; console.log(`MISSED ${r.sampleId}: read '${r.read}' expected '${l.expectedText}'`); }
}
console.log(`n=${n} right=${right} (${((100 * right) / n).toFixed(1)}%) falseAlarms=${fa} missed=${missed} unsure=${unsure}`);
