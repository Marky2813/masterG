# Spikes, benchmark results and API ledger

Each spike: a question, a numeric pass line, and a result with evidence. Record pass or fail only after the pass line itself was observed.

## Ledger (Gemini API, each person's own key)
Before a bulk run (full benchmark, rehearsal), check the quota or balance in Google AI Studio. The provider's number wins over this table.

| Date IST | Who | Purpose | Model | Calls / minutes | Quota or balance after (source) | Result / file |
|---|---|---|---|---|---|---|
| Oct 31 18:05 | Claude | model probe (6 combos) | flash-latest, 3.8/3.5-flash(-lite) | ~10 calls | free tier | `scripts/model-probe.ts` |
| Oct 31 18:07 | Claude | bench run 1 (free tier) | gemini-3.5-flash-lite | 144 calls, ~110 got 429 | free tier: per-minute quota hit | `benchmark/results/2026-10-31T12-37-57-098Z.md` (invalid) |
| Oct 31 18:15 | Claude | bench run 2, `--rpm 12` | gemini-3.5-flash-lite | 144 calls | free tier, 0 errors | `benchmark/results/2026-10-31T12-54-25-479Z.md` |
| Oct 31 18:30 | Claude | bench run 3 (key upgraded to paid by Akash) | flash-lite ×2 repeats; pro-latest ×1 | 288 + 48 calls | paid; pro: 20 API errors | `benchmark/results/2026-10-31T13-00-01-249Z.md`, `…12-57-15-307Z.md` |
| Nov 1 01:25 | Claude | bench after adding the handwriting rating to the judge prompt | flash-lite ×1, A+guard only, run twice | 96 calls | paid | `benchmark/results/2026-10-31T19-55-28-900Z.md` (96% verdict, 0 false alarms, p95 1.81 s), `….md.md` (98%, 0 false alarms, p95 1.69 s; handwriting: 46 neat, 2 ok, 0 messy) |
| Nov 1 01:20 | Claude | interrupt probe (`scripts/interrupt-probe.ts`): cut-off context note mid-reply | live 3.1 flash ×5 sessions | 5 sessions | paid | `logs/probe/interrupt-*.txt` (gitignored): no 1007; he resumed with "main keh raha tha…" but re-wrote the same working |
| Oct 31 18:28 | Claude | burst test 25 parallel | gemini-3.5-flash-lite | 25 calls | paid: 25/25 ok, p50 1.2 s | `scripts/burst.ts` |
| Nov 1 02:30 | Claude | teacher report e2e (`scripts/report-drive.mjs`): headless Chrome writes 3 sums with mouse strokes on /learn, opens 📋 Report | gemini-3.5-flash-lite | 2 full runs + 1 partial: 15 step calls + 2 report-summary calls | paid | `docs/screenshots/report/drive-result.json`: each full run: 6 steps, verdicts as intended (2 wrong, 4 correct; Flash labelled 3/8 `copied_wrong`, not `add_across`), AI summary written both runs, share link 795 chars |

## Results
| Spike | Issue | Owner | Status | Result |
|---|---|---|---|---|
| Pipeline benchmark (PLAN §7) | #4 | Claude | **pass on accuracy / near-miss on latency** | A+guard + current rule: 97.9 % verdict, 0 false alarms, p95 2.5 s (target 2 s) |
| Echo test + voice audition (PLAN §6) | | Akash | open | |
| Clustering on real stylus input | | Harjeet | open | |

---

## Spike: pipeline benchmark
**Why:** decides which config runs in the app (PLAN.md §7).
**Decision rule (agreed before results):** the fastest config with **0 false alarms, ≥ 95 % verdict accuracy, ≤ 2 s p95**.
**Samples:** `benchmark/samples/` (n = 48, Wacom, guided /capture; 28 correct / 20 wrong). **Run:** run 3, 2026-10-31 18:30 IST, `npm run bench -- --only A,A+guard,B,C,C+guard --concurrency 4 --repeat 2` (96 judgements per config), paid key. Flash = `gemini-3.5-flash-lite` (heavier Flash models took 62–122 s or timed out in the probe).

| Config | Read acc | Verdict acc | False alarms | Missed | p50 | p95 |
|---|---|---|---|---|---|---|
| A (Flash judges) | 91 % | 95 % | 4 | 1 | 1.76 s | 2.51 s |
| A+guard (rule at run time) | 91 % | 98 % | 1 | 1 | 1.76 s | 2.51 s |
| B (Flash reads, checker judges) | 94 % | 96 % | 0 | 3 | 1.67 s | 2.76 s |
| C+guard (low thinking) | 93 % | 97 % | 1 | 2 | 1.75 s | 2.22 s |
| D (gemini-pro-latest, 1 repeat) | 56 % | 58 % | 0 | 8 | 2.75 s | 4.43 s (20 API errors: not a fair score) |
| **A+guard + current rule** (offline re-decide of run 3 readings, `scripts/redecide.ts`) | 91 % | **97.9 %** | **0** | 1 | 1.76 s | 2.51 s |

Remaining misses: `word_problem-043` (model accepted a wrong setup, 60 × 5); `linear-019` read as "y = y" → now *unsure* (quiet), not a false alarm.
Not checked: the offline re-decide has no alternative readings (lower bound); the new rule hasn't had its own live run yet.

**Result:** 0 false alarms and ≥ 95 % met; p95 2.5 s misses the ≤ 2 s line by 0.5 s.
**Decision (proposed, needs Akash):** ship **A+guard** with the current rule (`src/lib/brain/decide.ts`), and accept p95 2.5 s, since it is one call per step and the fastest accurate option.

## Spike: echo test + voice audition
**Pass:** on laptop speakers in a noisy room, Masterji doesn't interrupt himself in 5/5 tries (hands-free), or push-to-talk is chosen.

## Spike: clustering
**Pass:** 10/10 written lines of a fraction chain become one cluster each, with no merges across lines.
