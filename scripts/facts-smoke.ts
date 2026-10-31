// npm run test:facts: computed board facts are right.
import { questionFacts } from "../src/lib/brain/facts";
let failed = 0;
const t = (q: string, must: string[]) => {
  const f = questionFacts(q);
  const ok = must.every((m) => f.some((x) => x.includes(m)));
  console.log(`${ok ? "PASS" : "FAIL"}  ${q} -> ${JSON.stringify(f)}`);
  if (!ok) failed++;
};
t("3/4 + 1/6", ["= 11/12", "LCM(4, 6) = 12", "3/4 = 9/12", "1/6 = 2/12", "9/12 + 2/12 = 11/12"]);
t("5/6 - 1/4", ["= 7/12", "LCM(6, 4) = 12"]);
t("3x + 5 = 20", ["x = 5", "3x = 20 - 5 = 15"]);
t("2 + 3 * 4", ["= 14"]);
if (failed) process.exit(1);
import { reachesFinalAnswer } from "../src/lib/brain/facts";
const f = (q: string, line: string, want: boolean) => {
  const ok = reachesFinalAnswer(q, line) === want;
  console.log(`${ok ? "PASS" : "FAIL"}  final? ${q} | ${line} -> ${reachesFinalAnswer(q, line)} (want ${want})`);
  if (!ok) process.exitCode = 1;
};
f("3/4 + 1/6", "11/12", true);
f("3/4 + 1/6", "= 11/12", true);
f("3/4 + 1/6", "9/12 + 2/12 = 11/12", true);
f("3/4 + 1/6", "22/24", true);
f("3/4 + 1/6", "9/12 + 2/12", false);
f("3/4 + 1/6", "3/4 + 1/6 = 9/12 + 2/12", false);
f("x - 1 = 0", "x = 1", true);
f("3x + 5 = 20", "x = 5", true);
f("3x + 5 = 20", "3x = 15", false);
f("x + 6 = 2", "x = -4", true);
f("4(p - 2) = 8", "p = 4", true);
f("4(p - 2) = 8", "p - 2 = 2", false);
import { isSimplified, simplestAnswer } from "../src/lib/brain/facts";
const s = (line: string, want: boolean) => { const ok = isSimplified(line) === want; console.log(`${ok ? "PASS" : "FAIL"}  simplified? ${line} -> ${isSimplified(line)}`); if (!ok) process.exitCode = 1; };
s("44/42", false); s("= 22/21", true); s("14/42 + 30/42 = 44/42", false); s("5", true);
console.log(simplestAnswer("2/6 + 5/7") === "22/21" ? "PASS  simplest 2/6 + 5/7 = 22/21" : (process.exitCode = 1, "FAIL simplest"));
// Answer guard: lines that give away the final answer (log 20-06-47: "2 + 3 = 5" at rung 2) vs method lines.
import { revealsAnswer, methodFacts } from "../src/lib/brain/facts";
const r = (q: string, line: string, want: boolean) => {
  const got = revealsAnswer(q, line);
  console.log(`${got === want ? "PASS" : "FAIL"}  reveals? ${q} | ${line} -> ${got}`);
  if (got !== want) process.exitCode = 1;
};
r("2 + 3", "2 + 3 = 5", true);
r("3 + 4", "Final answer = 7", true);
r("3 + 4", "Total 7 lines! Final answer = 7.", true);
r("3 + 4", "ab sab gino: 1, 2, 3, 4, 5, 6, 7", false);
r("2 + 3", "2 plus 3 is 5, not 7.", true);
r("2 + 3", "2 + 3 = ?", false);
r("3/4 + 1/6", "9/12 + 2/12 = 11/12", true);
r("3/4 + 1/6", "= 22/24", true);
r("3/4 + 1/6", "3/4 + 1/6 = 9/12 + 2/12", false);
r("3/4 + 1/6", "LCM(4, 6) = 12", false);
r("3/4 + 1/6", "3/4 = 9/12", false);
r("3/4 + 1/6", "Denominators alag!", false);
r("3x + 5 = 20", "3x = 20 - 5 = 15", false);
r("3x + 5 = 20", "x = 15/3 = 5", true);
r("3x + 5 = 20", "x = 5", true);
r("3x + 5 = 20", "3x + 5 = 20", false);
r("2x - 5 = 5", "2x - 5 = 5", false);
r("2x - 5 = 5", "2x = 5 + 5 = 10", false);
r("224 + 32", "4 + 2 = ?", false);
r("224 + 32", "224 + 32 = 256", true);
// Every FACTS / METHOD line except the final answer itself and the full worked line must still be writable.
r("24 * 13", "24 × 3 = 72", false);
r("24 * 13", "72 + 240 = 312", true); // the last line of column multiplication IS the answer
for (const q of ["3/4 + 1/6", "5/6 - 1/4", "2/3 + 1/5", "3x + 5 = 20", "x + 5 = 12", "2 + 3"]) {
  const lines = [...questionFacts(q), ...methodFacts(q)]
    .filter((f) => !/^(final answer|solution|working|graph|counting)/.test(f) && !/^step: \w = /.test(f))
    .map((f) => f.replace(/^[a-zA-Z ]+:\s*/, ""));
  for (const l of lines) r(q, l, false);
}
