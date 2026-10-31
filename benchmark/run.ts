// Benchmark: which pipeline reads + judges handwritten steps best? See PLAN.md §7.
//
//   npm run bench                         all configs, all samples
//   npm run bench -- --only A,B --limit 10 --repeat 2
//
// Decision rule (agreed up front): fastest config with 0 false alarms,
// >= 95% verdict accuracy and <= 2 s p95 latency.

import { GoogleGenAI, ThinkingLevel, type ThinkingConfig } from "@google/genai";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { checkReadings, normalize } from "../src/lib/checker";
import { buildStepPrompt, stepResponseSchema, type StepResponse, type StepTask } from "../src/lib/gemini/stepPrompt";

interface Sample {
  id: string;
  file: string;
  topic: string;
  question?: string;
  previous?: string;
  expectedText: string;
  isCorrect: boolean;
  category?: string;
}

interface ConfigDef {
  name: string;
  model: string;
  task: StepTask;
  thinking: "off" | "low";
  verdictFrom: "model" | "checker" | "model+guard";
}

interface Row {
  config: string;
  sampleId: string;
  topic: string;
  ms: number;
  error?: string;
  read?: string;
  readOk: boolean;
  predicted: "correct" | "wrong" | "unsure";
  verdictSource: "model" | "checker";
  expectedCorrect: boolean;
  category?: string;
  expectedCategory?: string;
  explanation?: string;
}

const ROOT = path.resolve(__dirname, "..");
const SAMPLES_DIR = path.join(ROOT, "benchmark", "samples");
const RESULTS_DIR = path.join(ROOT, "benchmark", "results");

const FLASH = process.env.GEMINI_FLASH_MODEL || "gemini-flash-latest";
const PRO = process.env.GEMINI_PRO_MODEL || "gemini-pro-latest";

const CONFIGS: ConfigDef[] = [
  { name: "A", model: FLASH, task: "judge", thinking: "off", verdictFrom: "model" },
  { name: "A+guard", model: FLASH, task: "judge", thinking: "off", verdictFrom: "model+guard" },
  { name: "B", model: FLASH, task: "read", thinking: "off", verdictFrom: "checker" },
  { name: "C", model: FLASH, task: "judge", thinking: "low", verdictFrom: "model" },
  { name: "C+guard", model: FLASH, task: "judge", thinking: "low", verdictFrom: "model+guard" },
  { name: "D", model: PRO, task: "judge", thinking: "low", verdictFrom: "model" },
];

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

// Gemini 2.x takes a token budget; newer models take a thinking level.
function thinkingConfig(model: string, thinking: "off" | "low"): ThinkingConfig {
  if (/gemini-2\./.test(model)) return { thinkingBudget: thinking === "off" ? 0 : 1024 };
  return { thinkingLevel: thinking === "off" ? ThinkingLevel.MINIMAL : ThinkingLevel.LOW };
}

const squash = (s: string) => normalize(s).replace(/\s+/g, "").toLowerCase();

function percentile(values: number[], p: number): number {
  if (values.length === 0) return NaN;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.ceil((p / 100) * sorted.length) - 1)];
}

async function callModel(ai: GoogleGenAI, cfg: ConfigDef, sample: Sample, png: string) {
  const started = performance.now();
  const res = await ai.models.generateContent({
    model: cfg.model,
    contents: [
      {
        role: "user",
        parts: [
          { inlineData: { mimeType: "image/png", data: png } },
          { text: buildStepPrompt({ task: cfg.task, question: sample.question, previous: sample.previous }) },
        ],
      },
    ],
    config: {
      temperature: 0,
      responseMimeType: "application/json",
      responseJsonSchema: stepResponseSchema(cfg.task),
      thinkingConfig: thinkingConfig(cfg.model, cfg.thinking),
    },
  });
  const ms = performance.now() - started;
  return { ms, parsed: JSON.parse(res.text ?? "{}") as StepResponse };
}

// Configs that differ only in how the verdict is decided share one model call per sample.
function callKey(cfg: ConfigDef) {
  return `${cfg.model}|${cfg.task}|${cfg.thinking}`;
}

async function runPool<T>(items: T[], size: number, fn: (item: T) => Promise<void>) {
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(size, items.length) }, async () => {
      while (next < items.length) await fn(items[next++]);
    }),
  );
}

function decide(cfg: ConfigDef, sample: Sample, r: StepResponse): Pick<Row, "predicted" | "verdictSource"> {
  const modelVerdict = r.verdict ?? "unsure";
  if (cfg.verdictFrom === "model") return { predicted: modelVerdict, verdictSource: "model" };
  const check = checkReadings([r.text, ...(r.alternatives ?? [])], {
    question: sample.question,
    previous: sample.previous,
  });
  if (check.status !== "unknown") return { predicted: check.status, verdictSource: "checker" };
  // Checker can't decide: B has nothing to fall back on (stay silent); guards fall back to the model.
  return cfg.verdictFrom === "checker"
    ? { predicted: "unsure", verdictSource: "checker" }
    : { predicted: modelVerdict, verdictSource: "model" };
}

async function main() {
  if (!process.env.GEMINI_API_KEY) {
    console.error("GEMINI_API_KEY missing — put it in .env.local (see .env.example).");
    process.exit(1);
  }
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

  let samples: Sample[] = JSON.parse(await readFile(path.join(SAMPLES_DIR, "labels.json"), "utf8"));
  const limit = Number(arg("limit") ?? 0);
  if (limit) samples = samples.slice(0, limit);
  const repeat = Number(arg("repeat") ?? 1);
  const only = arg("only")?.split(",");
  const configs = only ? CONFIGS.filter((c) => only.includes(c.name)) : CONFIGS;
  const concurrency = Number(arg("concurrency") ?? 3);

  if (samples.length === 0) {
    console.error("No samples yet — write some at http://localhost:3000/capture (npm run dev).");
    process.exit(1);
  }
  console.log(`${samples.length} samples × ${repeat} repeat(s) · flash=${FLASH} · pro=${PRO}`);

  const images = new Map<string, string>();
  for (const s of samples) images.set(s.id, (await readFile(path.join(SAMPLES_DIR, s.file))).toString("base64"));

  const rows: Row[] = [];
  const keys = [...new Set(configs.map(callKey))];
  for (const key of keys) {
    const sharing = configs.filter((c) => callKey(c) === key);
    process.stdout.write(`\n[${sharing.map((c) => c.name).join(", ")}] `);
    const jobs = samples.flatMap((s) => Array.from({ length: repeat }, () => s));
    await runPool(jobs, concurrency, async (sample) => {
      try {
        const { ms, parsed } = await callModel(ai, sharing[0], sample, images.get(sample.id)!);
        for (const cfg of sharing) {
          rows.push({
            config: cfg.name,
            sampleId: sample.id,
            topic: sample.topic,
            ms,
            read: parsed.text,
            readOk: squash(parsed.text ?? "") === squash(sample.expectedText),
            ...decide(cfg, sample, parsed),
            expectedCorrect: sample.isCorrect,
            category: parsed.category,
            expectedCategory: sample.category,
            explanation: parsed.explanation,
          });
        }
        process.stdout.write(".");
      } catch (e) {
        for (const cfg of sharing) {
          rows.push({
            config: cfg.name,
            sampleId: sample.id,
            topic: sample.topic,
            ms: NaN,
            error: (e as Error).message.slice(0, 200),
            readOk: false,
            predicted: "unsure",
            verdictSource: "model",
            expectedCorrect: sample.isCorrect,
          });
        }
        process.stdout.write("x");
      }
    });
  }
  console.log("\n");

  const summary = configs.map((cfg) => {
    const rs = rows.filter((r) => r.config === cfg.name);
    const ok = rs.filter((r) => !r.error);
    const verdictOk = rs.filter((r) => (r.predicted === "correct") === r.expectedCorrect && r.predicted !== "unsure");
    const falseAlarms = rs.filter((r) => r.expectedCorrect && r.predicted === "wrong").length;
    const missed = rs.filter((r) => !r.expectedCorrect && r.predicted !== "wrong").length;
    const wrongs = rs.filter((r) => !r.expectedCorrect && r.predicted === "wrong" && r.expectedCategory);
    const catOk = wrongs.filter((r) => r.category === r.expectedCategory).length;
    const lat = ok.map((r) => r.ms);
    const checkerShare = rs.filter((r) => r.verdictSource === "checker").length / Math.max(1, rs.length);
    return {
      config: cfg.name,
      model: cfg.model,
      errors: rs.length - ok.length,
      readAcc: ok.filter((r) => r.readOk).length / Math.max(1, rs.length),
      verdictAcc: verdictOk.length / Math.max(1, rs.length),
      falseAlarms,
      missed,
      categoryAcc: wrongs.length ? catOk / wrongs.length : NaN,
      checkerShare,
      p50: percentile(lat, 50),
      p95: percentile(lat, 95),
    };
  });

  const pct = (x: number) => (Number.isNaN(x) ? "—" : `${(x * 100).toFixed(0)}%`);
  const sec = (x: number) => (Number.isNaN(x) ? "—" : `${(x / 1000).toFixed(2)}s`);
  const header =
    "| config | model | read acc | verdict acc | false alarms | missed errors | category acc | checker decided | p50 | p95 | API errors |\n|---|---|---|---|---|---|---|---|---|---|---|";
  const lines = summary.map(
    (s) =>
      `| ${s.config} | ${s.model} | ${pct(s.readAcc)} | ${pct(s.verdictAcc)} | ${s.falseAlarms} | ${s.missed} | ${pct(s.categoryAcc)} | ${pct(s.checkerShare)} | ${sec(s.p50)} | ${sec(s.p95)} | ${s.errors} |`,
  );

  const eligible = summary
    .filter((s) => s.falseAlarms === 0 && s.verdictAcc >= 0.95 && s.p95 <= 2000 && s.errors === 0)
    .sort((a, b) => a.p50 - b.p50);
  const verdict = eligible.length
    ? `**Winner: ${eligible[0].config}** (fastest config with 0 false alarms, ≥95% verdict accuracy, ≤2 s p95).`
    : "**No config meets the rule** (0 false alarms, ≥95% verdict accuracy, ≤2 s p95). Look at the misses below before deciding.";

  const misses = rows
    .filter((r) => r.error || !r.readOk || (r.predicted === "correct") !== r.expectedCorrect)
    .map(
      (r) =>
        `| ${r.config} | ${r.sampleId} | ${r.topic} | ${r.expectedCorrect ? "correct" : "wrong"} | ${r.predicted} (${r.verdictSource}) | \`${r.read ?? ""}\` | ${r.category ?? ""} | ${r.error ?? r.explanation ?? ""} |`,
    );

  const report = `# Benchmark ${new Date().toISOString()}

${samples.length} samples × ${repeat} repeat(s)

${header}
${lines.join("\n")}

${verdict}

## Misreads, wrong verdicts and errors
| config | sample | topic | truth | predicted | read | category | note |
|---|---|---|---|---|---|---|---|
${misses.join("\n")}
`;

  console.log(`${header}\n${lines.join("\n")}\n\n${verdict}`);
  await mkdir(RESULTS_DIR, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  await writeFile(path.join(RESULTS_DIR, `${stamp}.md`), report);
  await writeFile(path.join(RESULTS_DIR, `${stamp}.json`), JSON.stringify({ summary, rows }, null, 2));
  console.log(`\nFull report: benchmark/results/${stamp}.md`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
