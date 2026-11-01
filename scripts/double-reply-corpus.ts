// How often does Masterji say his reply twice in one turn? Scans session logs for voice.turn entries,
// finds generation seams (a blank line, or a sentence end glued to the next capital) and restatements
// (restatedAt), and prints what came before each one (notes, tool calls and their responses, interrupts).
//   npx tsx scripts/double-reply-corpus.ts <logs dir> [<logs dir> ...]
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { restatedAt } from "../src/lib/voice/voiceService";

const dirs = process.argv.slice(2);
if (!dirs.length) dirs.push("logs");
const SEAM = /\n\s*\n|[.!?](?=\p{Lu})/u;
let turns = 0, spoken = 0, seams = 0, restated = 0, afterTool = 0, afterToolRestated = 0;
for (const d of dirs)
  for (const s of readdirSync(d).sort()) {
    const f = `${d}/${s}/events.jsonl`;
    if (!existsSync(f)) continue;
    let since: Record<string, unknown>[] = [];
    for (const line of readFileSync(f, "utf8").split("\n")) {
      if (!line.trim()) continue;
      const e = JSON.parse(line);
      if (e.type !== "client.voice.turn") {
        since.push(e);
        continue;
      }
      turns++;
      const said = String(e.masterji ?? "");
      const ctx = since
        .filter((x) => /^client\.voice\.(note|write_|set_question|draw_graph|show_counting|interrupt|ptt_up)/.test(String(x.type)))
        .map((x) => {
          const k = String(x.type).replace("client.voice.", "");
          if (k === "note") return `note${x.queued ? "(queued)" : ""} ${String(x.text).slice(0, 30)}`;
          if (k === "ptt_up" || k.startsWith("interrupt")) return k;
          return `${k}${x.duplicate ? "(dup)" : ""}${x.withheld ? "(withheld)" : ""}${x.ignoredSame ? "(same)" : ""}`;
        });
      since = [];
      if (!said) continue;
      spoken++;
      const tool = ctx.some((c) => /^(write_|set_question|draw_graph|show_counting)/.test(c));
      if (tool) afterTool++;
      const at = restatedAt(said);
      if (at >= 0) {
        restated++;
        if (tool) afterToolRestated++;
      }
      if (SEAM.test(said)) {
        seams++;
        console.log(`${at >= 0 ? "RESTATED" : "seam    "} ${s} ${String(e.t).slice(11, 19)}  before: ${ctx.join(" > ") || "-"}\n         ${JSON.stringify(said)}`);
      }
    }
  }
console.log(`\nturns ${turns}, spoken ${spoken}, with a seam ${seams}, restated ${restated} (${((100 * restated) / spoken).toFixed(1)}%); turns with a tool call ${afterTool}, of them restated ${afterToolRestated}`);
