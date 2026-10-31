// Summarise logs/probe/feel-*.json (from scripts/feel-probe.ts): npx tsx scripts/feel-summary.ts
import { readdirSync, readFileSync, writeFileSync } from "node:fs";

type Ev = { t: number; kind: string; text: string };
type Run = { scenario: string; variant: string; metrics: Record<string, unknown>; events: Ev[] };
const runs: Run[] = readdirSync("logs/probe")
  .filter((f) => /^feel-(setq|guard|chat)-(old|new)-\d+\.json$/.test(f))
  .map((f) => JSON.parse(readFileSync(`logs/probe/${f}`, "utf8")));

const lines: string[] = [];
const say = (s: string) => (console.log(s), lines.push(s));
for (const scenario of ["setq", "guard", "chat"])
  for (const variant of ["old", "new"]) {
    const rs = runs.filter((r) => r.scenario === scenario && r.variant === variant);
    if (!rs.length) continue;
    const turns = (r: Run) => r.events.filter((e) => e.kind === "turn").map((e) => e.text);
    const count = (f: (r: Run) => boolean) => `${rs.filter(f).length}/${rs.length}`;
    if (scenario === "setq")
      say(`setq  ${variant}: cut off by our note ${count((r) => r.events.some((e) => e.kind === "interrupted"))}, empty turn ${count((r) => turns(r).some((t) => !t))}, set_question >1 call ${count((r) => r.events.filter((e) => e.kind === "tool" && e.text.startsWith("set_question")).length > 1)}`);
    if (scenario === "guard") {
      // Saying the answer aloud is classified by hand (see docs/SPIKES.md): a regex mixes it up with counting aloud.
      say(`guard ${variant}: tried to write the answer ${count((r) => r.events.some((e) => e.kind === "answer_write_attempt"))}, "phir se / wahi galti" to a stuck child ${count((r) => turns(r).slice(2).some((t) => /phir\s*se\s*(wahi|galti|wohi)|phiir|wahi galti|same mistake/i.test(t)))}`);
    }
    if (scenario === "chat") {
      const bracket = (r: Run) => turns(r).some((t) => /\[|\bSTEP c\d|\brung \d|category:|child wrote/i.test(t));
      const praises = rs.flatMap((r) => (r.metrics.praises as string[]) ?? []);
      const firstWords = praises.map((p) => p.toLowerCase().replace(/[^a-z ]/g, "").split(" ").slice(0, 2).join(" "));
      const checks = rs.flatMap((r) => (r.metrics.checks as string[]) ?? []);
      const waits = checks.filter((c) => /ruko|dekh raha|check kar raha|dekhta hoon|dekhte hain/i.test(c)).length;
      // Called the unread step right or wrong anyway (no note had come for it).
      const judged = (r: Run) => ((r.metrics.checks as string[]) ?? []).some((c) => /galat|galti|wrong|bilkul sahi|ab sahi hai|theek kar liya|\[STEP/i.test(c));
      say(`chat  ${variant}: judged an unread step ${count(judged)}, note text spoken ${count(bracket)}, praises with "aage badho" ${praises.filter((p) => /aage badho/i.test(p)).length}/${praises.length}, distinct openings ${new Set(firstWords).size}/${praises.length}, "sahi hai?" with no note answered "looking/ruko" ${waits}/${checks.length}`);
    }
  }
writeFileSync("logs/probe/feel-summary.txt", lines.join("\n") + "\n");
