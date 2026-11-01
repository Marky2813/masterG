<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# MasterG: team rules for every agent (Claude Code, Codex, Cursor, ...)

AI math tuition teacher ("Masterji") for NCERT Classes 1–8. A kid writes on a stylus notebook. Masterji watches every step, stays quiet while it's right, and steps in by voice and red pen when it's wrong. **He never calls a correct step wrong.** That is the bar the whole product rests on.

**`PLAN.md` is the product source of truth.** Read it before any non-trivial work. This file holds the *working rules*. If the two conflict, stop and ask in team chat.

## Team and areas

Team: Akash (`adot-7`), Sarthak (`Marky2813`), Harjeet (`HARJEET-SINGH-dev`). **Nobody owns an area and nobody is pre-assigned.** We work as a relay: whoever has agent usage left takes the next ready issue, and hands off when their usage runs out (see *Relay* below). Several people can be active at once, each on a different issue.

The code is split into areas that only talk through the shared contract, so two active people rarely touch the same files:

| Area | Folders | Label |
|---|---|---|
| **Notebook** | `src/components/notebook/`, `src/lib/notebook/`, `src/app/page.tsx` layout, `/capture` | `lane:notebook` |
| **Voice** | `src/lib/voice/`, `src/components/voice/`, `src/app/api/live-token/` | `lane:voice` |
| **Brain** | `src/lib/checker.ts`, `src/lib/gemini/`, `src/lib/brain/`, `src/lib/memory/` (MEKO), `benchmark/` | `lane:brain` |
| **Red-pen engine** | `src/lib/redpen/`: pure module `(bbox, mark \| text) → animated strokes`; Notebook only renders it | `lane:brain` |
| Shared | `src/lib/types.ts`, `src/lib/bus.ts`, `src/components/debug/` (read-only event log at `/learn?debug=1`) | `lane:shared` |

Issues labelled `needs-hardware` need the stylus board, the demo laptop or the speakers: whoever has them takes those.

## Where work is tracked

- **GitHub issues are the tracker.** **The pinned Checklist issue (#32) is the source of truth**: an ordered queue of what's next, plus a *Baton* line saying who is active right now. Update it when you start, stop, or close something.
- Milestones are dependency phases (M0–M4). The only clock items are the freeze and the target below.

## Relay: picking up and handing off

1. **Start:** pull `main`, put your name in #32's Baton line, take the **top unclaimed item** in #32, and **assign yourself** to it. Assignment means "I'm on it right now" (a lock), nothing more.
2. **Continue someone's work:** read the latest **Handoff** comment on the issue and check out its branch.
3. **Merge small and often** (as soon as `npm run check` is green) so the next person starts from a fresh `main`.
4. **Usage running out:** commit (WIP is fine), push, keep a draft PR, post the Handoff comment (template in #32), **unassign yourself**, update the Baton line, tell the team in chat. A handoff must say the very next step and how to check what's done.

## Clock

- hackCBS 9.0. **Team target: tonight, Sun 1 Nov 00:00 IST.** Decided by the team on 2026-10-31.
- **Feature freeze: Sat 31 Oct 22:30 IST.** After it, only golden-path bug fixes, rehearsal, video and submission.

## Tracks we're entering (given by the team, 2026-10-31)

- **EdTech**: math tutor for NCERT Classes 1–8.
- **MLH Best Use of Gemini API**: Flash (vision read/judge) and the Live API (voice). Name exactly the models and APIs in the live path, nothing else.
- **Yugabyte: MEKO is required.** MEKO is Yugabyte's shared memory/context layer for multi-agent systems on YugabyteDB. Our use: the judging agent writes each mistake and fix to MEKO, Masterji (voice agent) recalls the kid's past mistakes across sessions, and optionally a parent-report agent reads the same memory (#33, #34, #35). MEKO calls are async and never sit in the ≤ 2 s verdict path.

## Workflow (every agent, every time)

1. **Always pull before you start and before you push:** `git switch main && git pull --rebase`. Start each task from a fresh `main`.
2. **Branch per issue:** `<issue#>-<topic>`, e.g. `9-clustering`, so anyone can pick it up. Never commit straight to `main`.
3. **Gate on exit codes:** `npm run check` (typecheck + lint + checker smoke test) must exit 0 before any push. Don't pipe it through `grep` or `tail` to decide. Use `scripts/gate --tail 20 npm run check` if you want short output.
4. **PR** with `Closes #N`, a summary, and a test plan. Unchecked boxes say what was *not* run. **Self-merge when `npm run check` is green** (squash). Then pull `main` again.
5. **Contract changes** (`src/lib/types.ts`, `src/lib/bus.ts`) need approval from one other teammate on the PR. If nobody else is active, merge only additive changes and flag them in #32 and in chat. Additive fields are preferred over renames.
6. Stay inside the folders of the issue you hold. If someone else is active in an area you need, coordinate in chat first.
7. Small commits, explicit `git add <paths>` (no `git add -A`). Rebase on `main` before merging if it moved.

## Honesty rules (status words mean exact things)

- **Status words:** "edited" < "tested offline" (unit test, or headless Chrome with mouse input) < "verified in browser" (Chrome on the demo laptop, real stylus, real mic) < "accepted" (a teammate saw it). Use "works" or "fixed" only for the last two.
- Every claim carries its evidence: what ran, where, how many samples, and what wasn't checked. One Gemini call is one sample, not proof.
- **No fake events or mocked AI anywhere.** Build the real pipeline in order; test each part against the real part before it.
- Public text (README, Devfolio form, video, pitch) claims only what is in `docs/CLAIMS.md` with evidence.

## Secrets and cost

- `GEMINI_API_KEY` and the MEKO credentials live only in `.env.local` (gitignored) and on the server. **Never ship it to the browser.** Live API sessions use ephemeral tokens from a Next.js route.
- Never print, log, commit or paste keys. Compare by hash if you must.
- Each person uses their own key unless decided otherwise. Before a big run (the full benchmark, rehearsals), check the quota or balance in Google AI Studio. Log benchmark and other bulk runs in the ledger in `docs/SPIKES.md`.

## Code rules

- Next.js 16 + React 19 + Tailwind 4. Read `node_modules/next/dist/docs/` before using a Next API (see the block at the top).
- Lanes talk **only** through `bus` events typed in `src/lib/types.ts`. No cross-lane imports of internals.
- Flash outputs **mathjs syntax**. The checker never sees handwriting. **When the checker can compute a step, the checker wins.**
- Benefit of the doubt: if any plausible reading makes a step correct, it's correct.
- Never write in the rough-work column. Never invent coordinates: AI marks go on cluster bboxes.

## Living docs (update them in the same PR as the change)

| File | Job |
|---|---|
| `docs/DECISIONS.md` | Every scope or product decision: date, who, why |
| `docs/SPIKES.md` | Benchmark and spike results with numbers, plus the API-usage ledger |
| `docs/CLAIMS.md` | Every public claim with its evidence, reconciled before submitting |
| `docs/DEMO.md` | Golden path script, tested lines, fallbacks, don't-claim list |
| `docs/SUBMISSION.md` | Checklist to the deadline |
| `drafts/` (gitignored) | Saved rules pages, research, scratch notes |

Keep deliverables, evidence and scripts in the repo, never in `/tmp`.
