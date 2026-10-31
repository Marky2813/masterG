// Re-run one benchmark sample through the app's judge and print everything: node --env-file=.env.local --import tsx scripts/replay-one.ts <sampleId>
import { readFileSync } from "node:fs";
import { judgeStep } from "../src/lib/gemini/judge";
async function main() {
  const id = process.argv[2];
  const labels = JSON.parse(readFileSync("benchmark/samples/labels.json", "utf8"));
  const l = labels.find((x: { id: string }) => x.id === id);
  const png = readFileSync(`benchmark/samples/${l.file}`).toString("base64");
  for (let i = 0; i < 3; i++) {
    const r = await judgeStep({ imagePng: png, question: l.question, previous: l.previous });
    console.log(JSON.stringify({ text: r.text, alternatives: r.alternatives, status: r.status, source: r.source, modelVerdict: r.modelVerdict, why: r.checkerReason, ms: r.ms }));
  }
}
main();
