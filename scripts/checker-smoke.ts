// Quick sanity run for the checker: npm run test:checker
import { checkReadings, checkStep, type CheckContext } from "../src/lib/checker";

const cases: [string, CheckContext, string][] = [
  ["3/4 + 1/6 = 4/10", { question: "3/4 + 1/6" }, "wrong"],
  ["3/4 + 1/6 = 11/12", { question: "3/4 + 1/6" }, "correct"],
  ["= 9/12 + 2/12", { question: "3/4 + 1/6" }, "correct"],
  ["= 11/12", { previous: "= 9/12 + 2/12", question: "3/4 + 1/6" }, "correct"],
  ["= 10/12", { previous: "9/12 + 2/12" }, "wrong"],
  ["0.5 + 0.25 = 0.75", {}, "correct"],
  ["2 + 3 * 4 = 20", {}, "wrong"],
  ["lcm(4,6) = 12", {}, "correct"],
  ["hcf(12,18) = 6", {}, "correct"],
  ["(1+2/3) + 1/3 = 2", {}, "correct"],
  ["3x = 20 - 5", { question: "3x + 5 = 20" }, "correct"],
  ["3x = 20 + 5", { question: "3x + 5 = 20" }, "wrong"],
  ["x = 5", { previous: "3x = 15" }, "correct"],
  ["x = 15/3", { previous: "3x = 15" }, "correct"],
  ["4(m+6) - 8 = 2m - 4", { question: "4(m+6) - 8 = 2m - 4" }, "correct"],
  ["4m + 16 = 2m - 4", { question: "4(m+6) - 8 = 2m - 4" }, "correct"],
  ["4m + 6 - 8 = 2m - 4", { question: "4(m+6) - 8 = 2m - 4" }, "wrong"],
  ["2x + 6", { question: "2(x+3)" }, "correct"],
  ["2x + 3", { question: "2(x+3)" }, "wrong"],
  ["a^2 + 2a*b + b^2", { question: "(a+b)^2" }, "correct"],
  ["x^2 = 9", {}, "unknown"],
];

let failed = 0;
for (const [line, ctx, expected] of cases) {
  const r = checkStep(line, ctx);
  const ok = r.status === expected;
  if (!ok) failed++;
  console.log(`${ok ? "PASS" : "FAIL"}  ${line.padEnd(26)} -> ${r.status.padEnd(8)} (${r.reason})`);
}

// Benefit of the doubt: kid's "1" might be a "7".
const bod = checkReadings(["3/4 + 1/6 = 11/12", "3/4 + 7/6 = 11/12"], { question: "3/4 + 1/6" });
console.log(`${bod.status === "correct" ? "PASS" : "FAIL"}  benefit of the doubt -> ${bod.status}`);
if (bod.status !== "correct") failed++;

console.log(failed ? `\n${failed} failed` : "\nall passed");
process.exit(failed ? 1 : 0);
