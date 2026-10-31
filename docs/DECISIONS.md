# Decisions

Every scope, product, workflow and access decision, on the day it's made. Newest on top. `PLAN.md` holds the design-session decisions; this file holds everything after. Times are IST.

| Date (IST) | Decision | Who decided | Why | Replaces |
|---|---|---|---|---|
| Oct 31 16:40 | Lane owners: Notebook = Harjeet, Voice = Akash, Brain + red-pen engine = Sarthak. `coderguneet` isn't on the build team. | Akash | Split by parallelism. The red-pen engine is a pure module, so moving it to Brain evens out the load (Notebook was the heaviest lane). | PLAN.md §9 (red-pen engine under P1) |
| Oct 31 16:40 | Milestones are dependency phases, not clock hours. The only clock items are freeze (Sun 06:00) and deadline. | Akash | The build is agent-driven, so the 12 h human timeline in PLAN.md §10 doesn't apply. | PLAN.md §10 |
| Oct 31 16:40 | Event clock is hackCBS 9.0's 24 h sprint, Sat 12:00 → Sun ~12:00 IST (deadline inferred, to confirm). | Akash, from the event page | `drafts/rules/hackcbs-home-2026-10-31.txt` L138–140 | PLAN.md's 12 h assumption |
| Oct 31 16:40 | Code lands by branch → PR → self-merge when `npm run check` is green. Contract changes need one other owner's approval. | Akash | Fast enough for a 24 h build, and still keeps `main` green. | — |
| Oct 31 16:40 | Team rules live in `AGENTS.md` (read by every agent). `CLAUDE.md` imports it. | Akash | Teammates may use agents other than Claude Code. | — |

## Accepted risks
| Date | Risk | Accepted by |
|---|---|---|

## Open (waiting on someone)
- Exact submission deadline and platform (Devfolio?), to confirm with the organisers. Owner: Akash.
- "Outstanding AI Agent Innovation" problem statement: fetch it and decide whether we enter. Owner: Akash.
