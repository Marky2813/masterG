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
