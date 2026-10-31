// Print a session timeline: npm run logs [sessionId]   (default: the latest session)
import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
const root = path.join(process.cwd(), "logs");
const sessions = readdirSync(root).filter((d) => statSync(path.join(root, d)).isDirectory()).sort((a, b) => statSync(path.join(root, b)).mtimeMs - statSync(path.join(root, a)).mtimeMs);
const id = process.argv[2] ?? sessions[0];
if (!id) { console.log("no sessions in logs/"); process.exit(0); }
console.log(`session ${id}  (${path.join("logs", id)})\n`);
const t0 = { v: 0 };
for (const line of readFileSync(path.join(root, id, "events.jsonl"), "utf8").split("\n").filter(Boolean)) {
  const e = JSON.parse(line);
  const t = Date.parse(e.t); if (!t0.v) t0.v = t;
  const { t: _t, type, ...rest } = e;
  void _t;
  console.log(`+${((t - t0.v) / 1000).toFixed(1).padStart(6)}s  ${type.padEnd(26)} ${JSON.stringify(rest)}`);
}
