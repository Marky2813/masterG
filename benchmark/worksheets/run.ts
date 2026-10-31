// Worksheet reader check: sends each test worksheet PNG through the REAL /api/worksheet route
// (Gemini Flash) and scores the list against expected.json with the checker.
//   npm run dev -- -p 3003   (in another shell)
//   npx tsx benchmark/worksheets/run.ts [baseUrl] [name ...]
// Writes benchmark/worksheets/results.json. One run = one Flash call per worksheet.
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { referenceAnswer } from "../../src/lib/checker";

const DIR = path.join(process.cwd(), "benchmark/worksheets");
type Item = { q?: string; word?: number[] };
type Read = { text: string; kind: string; label?: string };
const expected = JSON.parse(readFileSync(path.join(DIR, "expected.json"), "utf8")) as Record<string, { items: Item[]; skip: string[]; optional: string[] }>;
const base = process.argv[2]?.startsWith("http") ? process.argv[2] : "http://localhost:3003";
const only = process.argv.slice(2).filter((a) => !a.startsWith("http"));

const same = (a: string, b: string) => {
  const ra = referenceAnswer(a),
    rb = referenceAnswer(b);
  return !!ra && !!rb && ra.kind === rb.kind && ra.text === rb.text;
};
const matches = (e: Item, r: Read) =>
  e.q ? same(e.q, r.text) && r.kind !== "word_problem" : !!e.word && r.kind === "word_problem" && e.word.every((n) => r.text.replace(/,/g, "").includes(String(n)));

async function main() {
  const out: Record<string, unknown> = {};
  for (const [name, exp] of Object.entries(expected)) {
    if (name.startsWith("_") || (only.length && !only.includes(name))) continue;
    const png = readFileSync(path.join(DIR, `${name}.png`)).toString("base64");
    const res = await fetch(`${base}/api/worksheet`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-session-id": `worksheet-bench-${name}` },
      body: JSON.stringify({ imagePng: `data:image/png;base64,${png}`, source: "photo" }),
    });
    const r = (await res.json()) as { questions?: Read[]; title?: string; skipped?: number; ms?: number; error?: string };
    if (!res.ok || !r.questions) {
      console.log(`${name}: ERROR ${r.error ?? res.status}`);
      out[name] = { error: r.error ?? res.status };
      continue;
    }
    const used = new Set<number>();
    const perItem = exp.items.map((e) => {
      const i = r.questions!.findIndex((q, k) => !used.has(k) && matches(e, q));
      if (i >= 0) used.add(i);
      return { expected: e.q ?? `word problem with ${e.word!.join(", ")}`, read: i >= 0 ? r.questions![i].text : null, ok: i >= 0 };
    });
    const extra = r.questions.filter((_, k) => !used.has(k));
    const ok = perItem.filter((p) => p.ok).length;
    console.log(`${name}: ${ok}/${exp.items.length} read correctly | ${r.questions.length} returned | extra ${extra.length} (optional allowed ${exp.optional.length}) | ${r.ms} ms | title "${r.title ?? ""}"`);
    for (const p of perItem) console.log(`   ${p.ok ? "ok  " : "MISS"} ${p.expected}${p.ok ? `  <- "${p.read}"` : ""}`);
    for (const x of extra) console.log(`   extra [${x.kind}] ${x.label ?? ""}: ${x.text}`);
    out[name] = { score: `${ok}/${exp.items.length}`, returned: r.questions.length, extra, ms: r.ms, title: r.title, skipped: r.skipped, questions: r.questions, perItem };
  }
  writeFileSync(path.join(DIR, `results${only.length ? "-" + only.join("-") : ""}.json`), JSON.stringify({ at: new Date().toISOString(), base, results: out }, null, 2) + "\n");
}
main();
