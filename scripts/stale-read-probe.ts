// A line the child extended: does the judge read the new part, or tick the old reading?
// Replays the crop from log 2026-11-01T02-56-05-oe7z ("(18+4)/24" then "64/7" written to its right).
//   node --env-file=.env.local --import tsx scripts/stale-read-probe.ts <crop.png> [samples=3]
import { readFileSync } from "node:fs";
import { judgeStep } from "../src/lib/gemini/judge";

const png = readFileSync(process.argv[2]).toString("base64");
const n = Number(process.argv[3] ?? 3);
(async () => {
  for (const earlier of [undefined, "(18+4)/24"]) {
    for (let i = 0; i < n; i++) {
      const r = await judgeStep({ imagePng: png, question: "3/4 + 1/6", previous: "(3*6+1*4)/24", kind: "chain", earlier });
      console.log(`${earlier ? "with earlier" : "old path   "} ${i + 1}: ${r.status} "${r.text}" (${r.source}${r.checkerReason ? ", " + r.checkerReason : ""}, model ${r.modelVerdict}, ${r.ms} ms)`);
    }
  }
})();

// Control (argv[4] = a crop whose reading changes): a grown line with a new reading must not be retried.
if (process.argv[4]) {
  (async () => {
    const ctl = readFileSync(process.argv[4]).toString("base64");
    for (let i = 0; i < 2; i++) {
      const r = await judgeStep({ imagePng: ctl, question: "3/4 + 1/6", previous: "(3*6+1*4)/24", kind: "chain", earlier: "(18-" });
      console.log(`control ${i + 1}: ${r.status} "${r.text}" (${r.source}, ${r.ms} ms)`);
    }
  })();
}
