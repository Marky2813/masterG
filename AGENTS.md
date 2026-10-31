<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Master G: team rules for every agent (Claude Code, Codex, Cursor, ...)

AI math tuition teacher ("Masterji") for NCERT Classes 5–8. A kid writes on a stylus notebook. Masterji watches every step, stays quiet while it's right, and steps in by voice and red pen when it's wrong. **He never calls a correct step wrong.** That is the bar the whole product rests on.

**`PLAN.md` is the product source of truth.** Read it before any non-trivial work. This file holds the *working rules*. If the two conflict, stop and ask in team chat.

## Team and lanes

The plan splits the app into three lanes that only talk through the shared contract, so all three can be built in parallel against fake events.

| Lane | Owner (GitHub) | Owns | Label |
|---|---|---|---|
| **Notebook** (P1) | Harjeet (`HARJEET-SINGH-dev`) | `src/components/notebook/`, `src/lib/notebook/`, `src/app/page.tsx` layout, `/capture` | `lane:notebook` |
| **Voice** (P2) | Akash (`adot-7`) | `src/lib/voice/`, `src/components/voice/`, `src/app/api/live-token/` | `lane:voice` |
| **Brain** (P3) + red-pen engine | Sarthak (`Marky2813`) | `src/lib/checker.ts`, `src/lib/gemini/`, `src/lib/brain/`, `src/lib/redpen/`, `benchmark/` | `lane:brain` |
| Shared | everyone | `src/lib/types.ts`, `src/lib/bus.ts`, `src/lib/fakes.ts`, `/dev` | `lane:shared` |

The red-pen engine (wobbly marks + single-stroke font) moved from Notebook to Sarthak (decided 2026-10-31) to even out the load. It's a pure module: `(bbox, mark | text) → animated strokes`. Notebook only renders what it returns. `coderguneet` is a repo collaborator but not on the build team.

## Where work is tracked

- **GitHub issues are the tracker.** Every piece of work is an issue with a lane label and a milestone. **The pinned "Checklist" issue is the source of truth for what is left.** Update it when an issue changes state.
- Milestones are **dependency phases, not clock hours**. The build is agent-driven, so a phase closes when its gate is met. The only clock items are the feature freeze and the deadline (below).
- Pick up work: assign yourself, comment "starting", and open a draft PR early so others can see it.

## Clock

- hackCBS 9.0 (MLH member event). "Hackathon Begins" Sat 31 Oct 12:00 PM IST, "The 24-hour sprint" (`drafts/rules/hackcbs-home-2026-10-31.txt` L138–140, fetched 2026-10-31).
- **Deadline: Sun 1 Nov ~12:00 IST, inferred** from those lines. Day 2 of the schedule wasn't on the page. Confirm with the organisers and record the answer in `docs/DECISIONS.md`.
- **Feature freeze: Sun 1 Nov 06:00 IST.** After it, only bug fixes on the golden path, rehearsal, video and submission.

## Prizes we're aiming at (from the event page, 2026-10-31)

- Main prizes and **Best Social Innovation** (an education tool for kids).
- **MLH "Best Use of Gemini API"**: the whole pipeline is Gemini (Flash for vision, Live API for voice). Say exactly which models and APIs, and only the ones in the live path.
- **"Outstanding AI Agent Innovation"** (sponsored, ₹50,000): the problem statement isn't on the page yet. Fetch it before claiming fit.

## Workflow (every agent, every time)

1. **Always pull before you start and before you push:** `git switch main && git pull --rebase`. Start each task from a fresh `main`.
2. **Branch per issue:** `<name>/<issue#>-<topic>`, e.g. `harjeet/7-clustering`. Never commit straight to `main`.
3. **Gate on exit codes:** `npm run check` (typecheck + lint + checker smoke test) must exit 0 before any push. Don't pipe it through `grep` or `tail` to decide. Use `scripts/gate --tail 20 npm run check` if you want short output.
4. **PR** with `Closes #N`, a summary, and a test plan. Unchecked boxes say what was *not* run. **Self-merge when `npm run check` is green** (squash). Then pull `main` again.
5. **Contract changes** (`src/lib/types.ts`, `src/lib/bus.ts`) need approval from one other lane owner on the PR. Tag them and say what changed. Additive fields are preferred over renames.
6. Stay in your lane's folders. If you need something from another lane, open an issue or comment on theirs. Don't edit their internals.
7. Small commits, explicit `git add <paths>` (no `git add -A`). Rebase on `main` before merging if it moved.

## Honesty rules (status words mean exact things)

- **Status words:** "edited" < "tested offline" (unit test / mock / fake events) < "verified in browser" (Chrome on the demo laptop, real stylus, real mic) < "accepted" (a teammate saw it). Use "works" or "fixed" only for the last two.
- Every claim carries its evidence: what ran, where, how many samples, and what wasn't checked. One Gemini call is one sample, not proof.
- **Mocks and fake events never appear in the demo.** Each paid or rate-limited service has a free fake path for development.
- Public text (README, Devfolio form, video, pitch) claims only what is in `docs/CLAIMS.md` with evidence.

## Secrets and cost

- `GEMINI_API_KEY` lives only in `.env.local` (gitignored) and on the server. **Never ship it to the browser.** Live API sessions use ephemeral tokens from a Next.js route.
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
