# Claims register

Every claim that appears in public text (README, Devfolio form, video, pitch), with its evidence. Add a row when you write the claim. Reconcile the whole table before submitting.

Rules: numbers come from a fresh run of their source. "Not merged" means "not shipped". No always / every / never / first / only / real-time without a guarantee in code.

Status words (AGENTS.md): **edited** < **tested offline** (unit test, smoke test, or headless Chrome) < **verified in browser** (demo laptop, real stylus, real mic) < **accepted** (a teammate saw it). Say "works" or "fixed" only for the last two.

Last reconciled: Sun 1 Nov 2026, ~02:30 IST, against `main` at `67b2293` (includes PRs #58 and #59). Nobody has re-run the live app since #59 merged, so "verified in browser" below rests on Akash's runs of 31 Oct evening (logs listed) unless stated.

## Claims

| # | Claim (exact wording) | Where | Evidence | Date | Status |
|---|---|---|---|---|---|
| 1 | Masterji reads each handwritten step with Gemini `gemini-3.5-flash-lite` | README | `src/lib/gemini/judge.ts:9`; bench runs in SPIKES | 31 Oct | tested offline (benchmark on 48 Wacom samples); used live in Akash's runs (logs 31 Oct 14:48 onwards) |
| 2 | A mathjs checker overrides the model wherever it can compute | README | `src/lib/brain/decide.ts`; `npm run test:decide` 18/18 (PR #59 test plan); `npm run test:checker` | 31 Oct | tested offline |
| 3 | On 48 samples the shipped config had 0 false alarms in three runs | README | run 3 re-decided offline (97.9 % verdict, 0 FA); two later live runs 96 % / 98 %, 0 FA each: `benchmark/results/2026-10-31T19-55-28-900Z.md`, `…19-56-40-262Z.md` | 1 Nov 01:25 | tested offline. One writer, one board, 48 samples. Not general. |
| 4 | Verdict accuracy 96-98 % on the benchmark | README | same files | 1 Nov | tested offline |
| 5 | p95 step latency 1.69-1.81 s (later runs); 2.51 s in run 3 | README | same files; run 3 `…13-00-01-249Z.md` | 31 Oct - 1 Nov | tested offline. Latency varies with network and load. |
| 6 | Masterji stays quiet when a step is right and marks it with a tick | README, DEMO | Verdict bus + red-pen engine; logs show `client.verdict` events | 31 Oct | verified in browser by Akash (log 20-06-47 had 6 verdicts); no teammate saw it |
| 7 | Hint ladder: point, narrow, lead, show | README, DEMO | `src/lib/voice/persona.ts` rungs 1-4; steps carry `rung` in notes | 31 Oct | edited + seen in logs; not tested as a full 4-rung run |
| 8 | Hinglish voice, push-to-talk | README | `liveConfig.ts` (activity detection disabled); `src/lib/voice/config.ts` probe: 3.1 Live answers ~0.7-0.8 s | 31 Oct | verified in browser (Akash, many sessions) |
| 9 | Voice model is `gemini-3.1-flash-live-preview`, voice `Charon`, ephemeral tokens | README | `config.ts`, `liveConfig.ts`, `api/live-token/route.ts` | 31 Oct | verified in browser |
| 10 | Question by typing, photo, pasted screenshot or handwriting (PR #58) | README | PR #58; logs 18-57-48-h6hp, 19-03-20-oho0 (`question.read`, source photo) | 31 Oct | verified in browser for photo and handwritten (Akash). Paste and typed: tested offline only. |
| 11 | Notebook grows; earlier questions kept; new question on a new page (#54, in #58) | README | PR #58 | 31 Oct | edited; typecheck + lint only. Not tested with the stylus. |
| 12 | Landing page at `/`, app at `/learn`; light theme (#57, #58) | README | PR #58: dark-system-theme render headless | 31 Oct | tested offline (headless Chrome) |
| 13 | Masterji teaches a method on the board with `write_working` (multi-line working) | README, DEMO | PR #58: "Live model teaches LCM by multiples when asked kaise"; log 20-06-47 has 6 `write_working` events | 31 Oct | verified in browser (Akash, one session); one session is one sample |
| 14 | Masterji draws a graph of equations and circles the crossing (#55, fixed in #59) | README, DEMO | `scripts/graph-smoke.ts` (7 real line shapes from logs + garbage rejected), runs in `npm run check`; crossing computed by code | 1 Nov | tested offline. **#59 test plan: "graph tool end-to-end in the live app after this change" not run.** |
| 15 | Counting sticks for small sums, Classes 1-3 (`show_counting`) | README, DEMO | DECISIONS Nov 1 01:50; `src/lib/redpen/counting.ts`; `liveConfig.ts` | 1 Nov | edited. No recorded live run. |
| 16 | Pen writes faster (text ~8 chars/s, graph ~9.5 s) | not public | PR #59 "pen timing measured offline" | 1 Nov | tested offline |
| 17 | Ink placed clear of floating panels; scrolls into view, never while pen is down | README (if stated) | PR #59; test plan: "Not run: real browser at 120% zoom with the Wacom" | 1 Nov | edited (typecheck + lint). Do not claim. |
| 18 | Interrupting Masterji mid-reply works: he answers, then resumes ("main keh raha tha...") | DEMO | `scripts/interrupt-probe.ts`, 5 live sessions, no 1007 error, he resumed with "main keh raha tha..." but re-wrote the same working (SPIKES ledger). PR #59 added a 90 s duplicate refusal, which has no live run | 1 Nov 01:20 | tested offline (probe, not a browser run); 5 samples |
| 19 | Handwriting rating (neat / ok / messy) on every step; Masterji mentions messy writing at most once a minute; never changes the verdict | README (if stated) | PR #59; bench: 46 neat, 2 ok, 0 messy | 1 Nov | tested offline. **Messy case never observed**: all 48 samples were neat or ok. |
| 20 | Reconnects after the ~10 min Live session limit | README | PR #58 code; log 17-38-27 showed the GoAway; PR #58 test plan: "not waited out live" | 31 Oct | edited. Do not claim. |
| 21 | Classes 1-8 NCERT; Masterji asks the class and never refuses an easy sum | README | DECISIONS Nov 1 01:15; persona; checker handles Class 1-4 arithmetic | 1 Nov | edited. Not tested per class. |
| 22 | Kid's speech-to-text is hidden on screen (still logged) | not public | DECISIONS Nov 1 01:15 | 1 Nov | edited |
| 23 | Session logs stay on local disk, gitignored; no audio stored | README | `src/lib/log/server.ts` (events + step PNGs + transcripts only); `.gitignore` | 1 Nov | edited |
| 24 | Models in the live path: Flash `gemini-3.5-flash-lite` + Live `gemini-3.1-flash-live-preview`, nothing else | README, form | grep of `src/lib/gemini`, `src/lib/voice`, `src/app/api` | 1 Nov | tested offline (code search) |
| 25 | **Teacher/parent report**: per-question steps, marks, mistake types, hints, handwriting; AI teacher note grounded in those facts; share link, WhatsApp, print | README | PR #61: 2 headless-Chrome runs with mouse strokes and real Flash verdicts (6 steps each), the share link opened in a fresh profile, A4 PDF; re-run on the combined build 1 Nov 03:00 | 1 Nov | tested offline. Not run with stylus + voice. AI note: 3 samples. |
| 26 | **Homework-from-teacher queue**: worksheet → questions; Masterji follows it | README | PR #62: 4 rendered worksheets, 28/28 questions read (2 runs, same sheets used for tuning); headless UI drive; 3 + 1 live voice probes (he set homework questions in order, kept homework over his own sum, celebrated when done) | 1 Nov | tested offline. Not run on a real phone photo. |
| 27 | MEKO / YugabyteDB cross-session memory | none | Blocked on access (DECISIONS "Open") | 1 Nov | **not built.** Do not claim. |
| 28 | **Teacher dashboard**: class code, students join with name + roll (device keeps an ID), sessions sync live, class mistakes chart, topic × student grid, per-child sessions, AI "what to reteach" note | README | `scripts/classroom-drive.mjs` on :3001, 1 Nov ~05:55: teacher made a class in headless Chrome; 3 test students joined in separate profiles and wrote 9 steps with mouse strokes; all 9 Flash verdicts real, 15/15 saves OK; dashboard, note and per-session report rendered (`docs/screenshots/classroom/`). `npm run test:classroom` (19 checks: roll-ups, key hashing, same-name kids, path tricks). | 1 Nov | tested offline. Students were scripted ("Test …"), not real children. Not run with stylus + voice. AI class note: 2 samples. |
| 29 | "Added across" is labelled by code, not by Flash, for `a/b ± c/d` | not public | `src/lib/brain/mistakes.ts`, `test:facts`. Flash labelled "3/8" for 2/5 + 1/3 as "copied wrong" in 2 of 3 steps in one run before this; 3/3 right after | 1 Nov | tested offline |
| 30 | Masterji greets a child who joined a class by name, without asking | not public | `scripts/name-greet-probe.ts`: 3/3 used the name, 0/3 asked | 1 Nov | tested offline (live model, text note in, transcript out; no mic) |

## Measured numbers (one per quantity, reuse everywhere)

| Quantity | Value | Source run | Date |
|---|---|---|---|
| Verdict accuracy, shipped rule | 97.9 % (offline re-decide of run 3); 96 % and 98 % (live, 2 runs) | `docs/SPIKES.md`; `benchmark/results/2026-10-31T19-55-28-900Z.md`, `…19-56-40-262Z.md` | 31 Oct - 1 Nov |
| False alarms on benchmark set (48 steps, 28 correct) | 0 in the three runs above | same | same |
| Step latency p95 | 1.81 s and 1.69 s (later runs); 2.51 s (run 3) | same | same |
| Push-to-talk to first audio | ~0.7-0.8 s on Live 3.1 (probe, few samples) | `src/lib/voice/config.ts` comment, `scripts/ptt-probe.ts` | 31 Oct |
| Burst of 25 parallel Flash calls | 25/25 ok, p50 1.2 s | SPIKES ledger | 31 Oct 18:28 |

## Don't claim

- "Never wrong", "always correct", "zero mistakes". We claim 0 false alarms on 48 samples from one writer, and that the checker re-verifies what it can compute.
- Any figure about learning gains, grades, or time saved. We have no study. Write `[source needed]` if a number is wanted.
- Cross-session memory of the child, MEKO, YugabyteDB: not built.
- The report or homework queue as "used by teachers" or "classroom-tested": nobody outside the team has used them.
- Worksheet reading accuracy beyond "28/28 on 4 rendered test sheets" (no real phone photos tested).
- A live deployment. There is none.
- Reconnect after 10 minutes, 120 % zoom placement, graph tool end-to-end after #59, messy-handwriting flag, counting sticks: not run live.
- Handwriting recognition accuracy in general. The benchmark is 48 samples, one hand.
- Any Gemini model or API that is not in the live path (`gemini-pro-latest` was only probed).
- Topics PLAN.md lists as out of scope: constructions, angles, symmetry, "explain why" answers. Graphs are now partly in scope (linear equations only).
- "Replaces the teacher" or "better than a tutor". Positioning is: a teaching assistant for practice at home. We have no comparison.
- Child-safety or privacy certification. See `docs/LAUNCH.md` for what is planned.
- "Real-time". Steps take about 1.7-2.5 s.
