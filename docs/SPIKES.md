# Spikes, benchmark results and API ledger

Each spike: a question, a numeric pass line, and a result with evidence. Record pass or fail only after the pass line itself was observed.

## Ledger (Gemini API, each person's own key)
Before a bulk run (full benchmark, rehearsal), check the quota or balance in Google AI Studio. The provider's number wins over this table.

| Date IST | Who | Purpose | Model | Calls / minutes | Quota or balance after (source) | Result / file |
|---|---|---|---|---|---|---|

## Results
| Spike | Issue | Owner | Status | Result |
|---|---|---|---|---|
| Pipeline benchmark (PLAN §7) | | Sarthak | open | |
| Echo test + voice audition (PLAN §6) | | Akash | open | |
| Clustering on real stylus input | | Harjeet | open | |

---

## Spike: pipeline benchmark
**Why:** decides which config runs in the app (PLAN.md §7).
**Decision rule (agreed before results):** the fastest config with **0 false alarms, ≥ 95 % verdict accuracy, ≤ 2 s p95**.
**Samples:** `benchmark/samples/` (n = ?). **Run:** `npm run bench`, report in `benchmark/results/`.

| Config | Read acc | Verdict acc | False alarms | Missed | p50 | p95 |
|---|---|---|---|---|---|---|

**Result:** — **Decision:** —

## Spike: echo test + voice audition
**Pass:** on laptop speakers in a noisy room, Masterji doesn't interrupt himself in 5/5 tries (hands-free), or push-to-talk is chosen.

## Spike: clustering
**Pass:** 10/10 written lines of a fraction chain become one cluster each, with no merges across lines.
