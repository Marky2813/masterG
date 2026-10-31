# Decisions

Every scope, product, workflow and access decision, on the day it's made. Newest on top. `PLAN.md` holds the design-session decisions; this file holds everything after. Times are IST.

| Date (IST) | Decision | Who decided | Why | Replaces |
|---|---|---|---|---|
| Oct 31 17:00 | **Relay model:** no owners, no pre-assignment. Whoever has agent usage takes the top ready item in #32; hand off via an issue comment when usage runs out. | Akash | Usage limits run out at different times; one person continues where another stopped. | Oct 31 16:40 lane owners |
| Oct 31 17:00 | **Target: tonight, Sun 1 Nov 00:00 IST.** Freeze Sat 22:30 IST. | Akash | Team goal. | Oct 31 16:40 inferred Sun 12:00 deadline |
| Oct 31 17:00 | **Tracks:** EdTech, MLH Best Use of Gemini API, Yugabyte (MEKO required). Taken as given; no source check. | Akash | Team knowledge from the event. | Oct 31 16:40 (Social Innovation, AI Agent track) |
| Oct 31 17:00 | MEKO use: shared memory between the judging agent, the Masterji voice agent and an optional parent-report agent; cross-session mistake recall (#33–#35). | Claude, proposed | Fits MEKO's multi-agent memory and gives a demo-visible feature. Open for the team to change. | — |
| Oct 31 17:00 | Start step judging (#13) with config A+guard instead of waiting on the benchmark; swap if #4 picks another. | Claude, proposed | Benchmark needs stylus samples first; the config is a one-line switch. | PLAN.md §7 gate ordering |
| Oct 31 16:40 | Lane owners: Notebook = Harjeet, Voice = Akash, Brain + red-pen engine = Sarthak. `coderguneet` isn't on the build team. | Akash | Split by parallelism. The red-pen engine is a pure module, so moving it to Brain evens out the load (Notebook was the heaviest lane). | PLAN.md §9 (red-pen engine under P1) |
| Oct 31 16:40 | Milestones are dependency phases, not clock hours. The only clock items are freeze (Sun 06:00) and deadline. | Akash | The build is agent-driven, so the 12 h human timeline in PLAN.md §10 doesn't apply. | PLAN.md §10 |
| Oct 31 16:40 | Event clock is hackCBS 9.0's 24 h sprint, Sat 12:00 → Sun ~12:00 IST (deadline inferred, to confirm). | Akash, from the event page | `drafts/rules/hackcbs-home-2026-10-31.txt` L138–140 | PLAN.md's 12 h assumption |
| Oct 31 16:40 | Code lands by branch → PR → self-merge when `npm run check` is green. Contract changes need one other owner's approval. | Akash | Fast enough for a 24 h build, and still keeps `main` green. | — |
| Oct 31 16:40 | Team rules live in `AGENTS.md` (read by every agent). `CLAUDE.md` imports it. | Akash | Teammates may use agents other than Claude Code. | — |

## Accepted risks
| Date | Risk | Accepted by |
|---|---|---|

## Open (waiting on someone)
- MEKO access (account, key, endpoint, docs) for #33.
- Which "later" items in #32 to cut (modes, push-to-talk, reconnection, word problems, long division, parent report).
