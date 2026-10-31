# Master G

AI math tuition teacher ("Masterji") for NCERT Classes 5–8. **Read [PLAN.md](PLAN.md) first** — it's the source of truth.

## Setup

```bash
npm install
cp .env.example .env.local     # put your GEMINI_API_KEY in .env.local — never commit it
npm run dev
```

## Hour 0–1.5: benchmark

1. `npm run bench:models` — check which Gemini models your key can use; set `GEMINI_FLASH_MODEL` / `GEMINI_PRO_MODEL` in `.env.local` if the defaults aren't listed.
2. `npm run dev`, open <http://localhost:3000/capture>, write ~48 labelled steps on the stylus board (see PLAN.md §7). Samples land in `benchmark/samples/` — commit them so everyone shares one set.
3. `npm run bench` — prints the table and the winner; full report in `benchmark/results/`.
   Options: `--only A,B` · `--limit 10` · `--repeat 2` · `--concurrency 3`.

## Where things live

| Path | What | Owner |
|---|---|---|
| `src/lib/types.ts`, `src/lib/bus.ts` | Shared contract + event bus (frozen) | all |
| `src/lib/checker.ts` | Deterministic mathjs step checker (`npm run test:checker`) | P3 |
| `src/lib/gemini/stepPrompt.ts` | Flash read/judge prompt + JSON schema (used by app and benchmark) | P3 |
| `src/lib/categories.ts` | Seed mistake categories | P3 |
| `src/app/capture/` | Benchmark sample capture page | P1 |
| `benchmark/` | Benchmark runner, samples, results | P3 |
