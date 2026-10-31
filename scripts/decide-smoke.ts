// Verdict-rule sanity run: npm run test:decide
import { decide, plausibleAlternatives } from "../src/lib/brain/decide";
let failed = 0;
const t = (name: string, ok: boolean) => { console.log(`${ok ? "PASS" : "FAIL"}  ${name}`); if (!ok) failed++; };

t("confusable 1/7 alternative kept", plausibleAlternatives("1/10 + 1/5 = 3/10", ["7/10 + 1/5 = 3/10"]).length === 1);
t("corrected answer is NOT an alternative", plausibleAlternatives("0.5 + 0.25 = 0.30", ["0.5 + 0.25 = 0.75"]).length === 0);
t("different length rejected", plausibleAlternatives("3/4 + 1/6 = 4/10", ["3/4 + 1/6 = 11/12"]).length === 0);
t("wrong decimal stays wrong", decide({ text: "0.5 + 0.25 = 0.30", alternatives: ["0.5 + 0.25 = 0.75"], modelVerdict: "wrong", question: "0.5 + 0.25" }).status === "wrong");
t("messy 7 gets benefit of the doubt", decide({ text: "1/10 + 1/5 = 9/10", alternatives: ["7/10 + 1/5 = 9/10"], modelVerdict: "wrong" }).status === "correct");
t("messy 4/9 benefit of the doubt", decide({ text: "y = 9", alternatives: ["y = 4"], modelVerdict: "wrong", question: "7y - 9 = 19", previous: "7y = 28" }).status === "correct");
t("checker beats a model false alarm", decide({ text: "3/4 + 1/6 = 11/12", alternatives: [], modelVerdict: "wrong", question: "3/4 + 1/6" }).status === "correct");
t("word problem: wrong setup stays wrong", decide({ text: "60 * 5 = 300", alternatives: [], modelVerdict: "wrong", question: "5 pens cost Rs 60. What do 8 pens cost?", kind: "word_problem" }).status === "wrong");
t("word problem: bad arithmetic caught", decide({ text: "500 - 235 = 335", alternatives: [], modelVerdict: "correct", kind: "word_problem" }).status === "wrong");
t("word problem: right step stays right", decide({ text: "60 / 5 = 12", alternatives: [], modelVerdict: "correct", kind: "word_problem" }).status === "correct");
t("garbled read (y = y) is unsure, not wrong", decide({ text: "y = y", alternatives: [], modelVerdict: "wrong", question: "7y - 9 = 19", previous: "7y = 28" }).status === "unsure");
t("4 read as y: alternative accepted", decide({ text: "y = y", alternatives: ["y = 4"], modelVerdict: "wrong", question: "7y - 9 = 19", previous: "7y = 28" }).status === "correct");
t("half-written 3/4 is not wrong", decide({ text: "3/4", alternatives: [], modelVerdict: "wrong", question: "3/4 + 1/6" }).status === "unsure");
t("line ending in = is not wrong", decide({ text: "3/4 + 1/6 =", alternatives: [], modelVerdict: "wrong", question: "3/4 + 1/6" }).status === "unsure");
t("full wrong line still wrong", decide({ text: "3/4 + 1/6 = 4/10", alternatives: [], modelVerdict: "wrong", question: "3/4 + 1/6" }).status === "wrong");
t("lcm working line is judged on its own", decide({ text: "lcm(4,6) = 12", alternatives: [], modelVerdict: "correct", question: "3/4 + 1/6" }).status === "correct");
t("wrong lcm working caught", decide({ text: "lcm(4,6) = 24", alternatives: [], modelVerdict: "correct", question: "3/4 + 1/6" }).status === "wrong");
if (failed) { console.log(`\n${failed} failed`); process.exit(1); }
console.log("\nall passed");
