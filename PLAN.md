# MasterG — Build Plan

> AI math tuition teacher ("Masterji") that watches a kid solve sums in a digital notebook, catches mistakes step by step, scolds a little, hints, and makes them try again — in Hinglish or English, by voice, writing on the notebook in red pen.

This doc is the single source of truth for the 12-hour build. Every decision below was agreed in a design session; if you want to change one, say so in the team chat first.

---

## 1. Product

**Users:** Classes 1–8, NCERT syllabus (new *Maths Mela* / *Ganita Prakash* books), mostly in India. Parents are the buyers.

**Experience:** the kid writes on a notebook with a stylus. Masterji watches every step, stays quiet while things are right, steps in when a step is wrong, and pushes the kid to find the mistake themselves.

### In scope (v1)
| Topic type | Examples | Checked by |
|---|---|---|
| Expression chains | fractions, decimals, integers, BODMAS, exponents, LCM/HCF, expanding brackets | Flash + mathjs checker |
| Linear equations (one variable) | `3x + 5 = 20`, `4(m + 6) − 8 = 2m − 4` | Flash + small linear solver |
| Column / long division layouts | `12 ) 4536 ( 378` | Flash reads the block, checker re-runs the algorithm |
| Word problems | proportion, percentages, money, time | Flash judges the setup; checker verifies the arithmetic lines |
| Lists / factor trees | multiples, prime factorisation | Flash judges (checker verifies products where it can) |

### Out of scope (v1)
- **Graphs, constructions, angles, symmetry, maps** → roadmap slide: *graph-paper mode* (gridded canvas; bar heights / plotted points measured from strokes, compared to data deterministically).
- **"Explain why" written-reasoning questions** → Masterji redirects in character: *"Ye toh likh ke samjhao, main abhi sirf calculation check karta hoon."*
- **Auto-generated follow-up practice problems.**

---

## 2. Persona — Masterji

- Classic Indian tuition teacher: strict, sharp, a bit dramatic, funny, clearly cares.
- Signature lines: *"Ye galat hai."*, *"Phir se wahi galti?"*, *"Dhyan se padho question."*, *"Saaf likho beta."*
- **Language:** kid picks **English** or **Hinglish** on the start screen; switchable mid-session via toggle. Same persona in both (English mode keeps the Indian flavour: *"Arre beta, look at line 2 again!"*). **Demo default: Hinglish.** Hinglish = Hindi-heavy with English math terms (numerator, LCM, carry, remainder). Captions and margin notes are Roman script.
- **Voice:** male, older-sounding Gemini Live prebuilt voice — audition 3–4 in hour 0–1.5.
- Asks the kid's name in the greeting and uses it (*"Arjun beta, saaf likho"*).

### Guardrails (hard-coded in the system prompt)
1. Max **one** dramatic line per mistake, then straight to a hint.
2. **Banned words about the child:** *bewakoof, nalayak, dimaag nahi hai,* etc. Scold the mistake, never the kid.
3. **Praise effort** when the kid fixes something: *"Dekha? Khud pakda!"*
4. **Soften** when the kid sounds frustrated or makes 3+ mistakes in a row: *"Koi baat nahi, saath mein karte hain."*

### Hint ladder (one rung per failed attempt / "nahi pata" on the same mistake)
1. **Point** — *"Line 2 dobara dekho."*
2. **Narrow** — circle the exact wrong part: *"Ye dekho, yahaan kya kiya?"*
3. **Lead** — guiding question: *"Denominator alag ho toh kya karte hain?"*
4. **Show** — write the correct step in red in the margin, then *"Ab agla line tum karo."*

---

## 3. Hardware & platform

- **Next.js** (App Router, TypeScript) web app, run in **Chrome/Edge on a laptop**.
- **USB stylus board** connected to the laptop. In the tablet driver, map the board to the notebook area / browser window. Pen cursor dot is visible on the canvas.
- **Audio through laptop speakers** (judges must hear it) — see §6 for echo handling.

---

## 4. The notebook (canvas)

- Custom canvas on [`perfect-freehand`](https://github.com/steveruizok/perfect-freehand) — pen pressure, eraser. No Excalidraw/tldraw (we need full control over stroke data and AI-drawn strokes).
- **Free-flow writing.** Ruled lines are cosmetic; the kid writes anywhere, any layout.
- **Rough-work column** on the right (~25% width, dashed divider, labelled "Rough Work"). **Never clustered, never read, never marked.** Masterji never writes there.
- **Question box** at the top. Three inputs: handwrite / upload-or-paste photo/screenshot / type. Flash extracts the question; Masterji **reads it back for confirmation every time** (*"Toh sawaal hai 3/4 + 2/5. Theek hai?"*). At confirmation, Flash also classifies it (chain / equation / vertical / word problem / unsupported).
- **Stroke clusters (client-side):** strokes are grouped by spatial proximity + timing into clusters, each with an `id` and `bbox`. All AI marks are placed on cluster bboxes — the model never invents coordinates.
- **Erase/overwrite:** that cluster's marks and notes vanish, the cluster is re-checked. The mistake **stays in memory**.

### AI handwriting (red pen)
- **Marks** (tick, cross, circle, underline, arrow): procedurally generated wobbly Bézier strokes, animated stroke-by-stroke, slightly randomised every time.
- **Text** (margin notes: "LCM?", "carry 1", "9/12"): animated **single-stroke (Hershey-style) font** with jitter + slant. Roman script.
- **Who decides what:** verdict marks (✓ ✗ ◯) are placed **by code** from the verdict. Margin notes come from the **voice model via the `write_note` tool**, so writing stays in sync with speech.

---

## 5. The AI pipeline

```
 strokes ──► crop active area (numbered boxes per cluster) ──► FLASH ──► { text, alternatives, verdict, category, hint }
                                                                   │
                                                                   ├──► mathjs CHECKER re-verifies every step it can parse
                                                                   │      (checker wins on disagreement)
                                                                   ▼
                                                     verdict ──► notebook (marks) + LIVE (speaks, writes notes)
```

### Who does what
| Job | Who | Why |
|---|---|---|
| **Read** the handwriting → text | Gemini **Flash** (vision) | Fast at OCR. Gets a crop of the active area with a faint numbered box around each cluster ("set-of-mark"), returns per-cluster text + role + alternative readings for unsure digits. |
| **Judge** right/wrong | Flash **and/or** the deterministic **checker** — *decided by the benchmark (§7)* | |
| **Guard** against false alarms | **mathjs checker**, always on | Exact, <1 ms, same input → same verdict. If Flash says "wrong" but the checker can compute the step and says "right", the checker wins. |
| **Diagnose** why it's wrong + pick the category | Flash (Pro only if the benchmark shows Flash can't) | |
| **Speak** in character | Gemini **Live API** (native audio) | Only ever receives verdicts as hidden text, e.g. `[cluster 3 WRONG, add_across, rung 1]`. **Never judges math itself.** |

### Why a deterministic checker at all (if Flash is good)
A tutor that calls a correct step wrong — even once — loses the kid's trust. Code computing `3/4 + 1/6` is never wrong and costs nothing. So the checker sits behind Flash as a safety net: Flash gives speed and covers what code can't parse (word-problem setup, factor trees); the checker guarantees we never scold a correct calculation.

**The checker never sees handwriting — it receives Flash's text.** Example:
1. Kid writes `3/4 + 1/6 = 4/10`, pauses.
2. Flash returns `{ text: "3/4 + 1/6 = 4/10", verdict: "wrong", category: "add_across" }`.
3. Checker (mathjs, exact Fraction mode): left = 11/12, right = 2/5 → **wrong**. Agrees → verdict stands.
4. Chain check: each line must also equal the previous line / the question's value.
5. Linear equations: each line must have the **same solution** as the previous line (a ~30-line solver on top of mathjs: for linear `f(x) = lhs − rhs`, `x = −f(0) / (f(1) − f(0))`).

Flash is told to output **mathjs syntax**: `*` not `×`, `/` not `÷`, mixed fractions as `(1+2/3)`, `lcm(4,6)`, `hcf(12,18)` (we map `hcf` → `gcd`).

### Ambiguous handwriting (1 vs 7, 4 vs 9)
- Flash returns alternative readings for unsure digits.
- **Benefit of the doubt:** if *any* reading makes the step correct → treat as correct (silent tick). Only if *every* reading is wrong does Masterji correct.
- If the ambiguity is in the **question itself** → he asks: *"Saaf likho beta, ye 1 hai ya 7?"*
- Rule: **a wrong correction is worse than a slow one.** Correct only when confident; otherwise ask or stay quiet.

### When each model is called
| Trigger | What runs | Target latency |
|---|---|---|
| Pen pause ~1.5 s in the main area | Flash read(+judge) → checker | ≤ 2 s p95 |
| Checker says WRONG | Live speaks rung 1 + code circles the cluster | ~0.5 s after verdict |
| Kid speaks | Live only | ~0.5–1 s |
| Correct step | nothing extra — silent tick | — |

### Mistake memory (within the session)
- ~10 **seed categories**: `add_across` (added numerators & denominators), `carry_forgot`, `borrow_error`, `decimal_misaligned`, `bodmas_order`, `table_slip`, `simplify_incomplete`, `copied_wrong`, `sign_transpose` (didn't flip sign moving a term across `=`), `distribute_partial` (bracket not fully expanded).
- **Grows during the session:** the model gets the current list each time, **must reuse** a fitting category, may **create** a new one (`id` + Hinglish label, e.g. `zero_in_quotient` / "quotient mein zero bhool gaye") only if none fits.
- *"Phir se wahi galti!"* fires **deterministically** when a category id repeats. The list is also fed to Masterji so he can reference past mistakes naturally.

---

## 6. Voice, interruption & modes

### Interruption
- Live API detects the kid speaking → sends `interrupted` → we **flush the audio queue** immediately (Masterji stops mid-word, his caption freezes with "—").
- Notebook: an **in-progress mark finishes** (no half-circles), **queued notes are cancelled**, **verdicts always stay**.

### Echo (speakers, noisy hall) — three layers
1. Browser `echoCancellation: true` on the mic.
2. Lower Live API voice-activity sensitivity.
3. **Stage mode** switch → push-to-talk on the **pen's barrel button** or **spacebar** (Live API manual activity start/end). Pressing it while Masterji talks stops him instantly.

Test in hour 0–1.5 with real speakers; decide hands-free vs stage mode on stage.

### Captions
Two-line subtitles at the bottom: Masterji's current line + the kid's current line (from Live API input/output transcription). No chat log.

### Modes (toggle in corner, or by voice: *"Masterji, abhi chup raho"*)
- **Proactive (demo default):** each cluster checked on ~1.5 s pen pause. Correct → silent tick. Wrong → Masterji speaks (never mid-stroke). No writing for ~25 s → nudge: *"Kya hua? Atak gaye?"*
- **Reactive:** checks + ticks run silently in the background; Masterji only speaks when asked (*"Masterji, sahi hai?"* or a **"Check karo"** button). Answer is instant because the check already ran.

---

## 7. Benchmark first (hours 0–1.5)

**Goal:** decide the pipeline from data, not vibes.

### Configs
| Config | What |
|---|---|
| **A** | One Flash call reads **and** judges (thinking off) |
| **A+guard** | A, with the checker overriding where it can compute (computed from A's output, no extra call) |
| **B** | Flash reads only → checker judges |
| **C** | Flash reads + judges with a small thinking budget |
| **D** | Pro reads + judges (accuracy ceiling) |

### Metrics
- **Read accuracy** — transcription correct?
- **Verdict accuracy** — right/wrong called correctly?
- **False alarms** — correct step called wrong (**the worst failure**)
- **Missed errors** — wrong step called correct
- **Latency** p50 / p95
- **Diagnosis quality** — category correct? (eyeball the report)

### Decision rule (agreed before seeing results)
**Fastest config with 0 false alarms, ≥ 95 % verdict accuracy, ≤ 2 s p95.**

### Samples
~**48** handwritten on the **actual stylus board** via the `/capture` page: 10 fractions, 10 linear equations, 10 BODMAS/decimals, 10 LCM/HCF, 8 word-problem steps. About half with a typical mistake, plus deliberately messy digits (1/7, 4/9, 5/S). Each is labelled with the expected text, correct/wrong, and category.

```bash
npm run dev            # then open http://localhost:3000/capture and write samples
npm run bench          # runs all configs, prints the table, writes benchmark/results/*.md
npm run bench:models   # lists the Gemini models your key can use
```

---

## 8. Shared contract (frozen in hour 0)

All three parts talk **only** through `src/lib/types.ts` + the event bus in `src/lib/bus.ts`. *(2026-10-31: no fake events. The real pipeline is built in order, each part tested against the real part before it.)*

| Event | From → To | Payload |
|---|---|---|
| `clusterUpdated` | Notebook → Brain | `{ id, bbox, imagePng, strokeIds }` |
| `clusterRemoved` | Notebook → Brain | `{ id }` |
| `questionSubmitted` | Notebook → Brain | `{ source: 'handwritten' \| 'photo' \| 'typed', imagePng?, text? }` |
| `questionConfirmed` | Brain/Voice → all | `{ text, kind }` |
| `verdict` | Brain → Notebook + Voice | `{ clusterId, status, mark, text, category?, categoryIsNew?, repeatCount, hintRung, hint? }` |
| `writeNote` | Voice → Notebook | `{ clusterId, text }` |
| `userUtterance` | Voice → Brain | `{ text }` |
| `modeChanged` | Voice/UI → all | `{ mode: 'proactive' \| 'reactive' }` |
| `languageChanged` | UI → all | `{ language: 'hinglish' \| 'english' }` |

---

## 9. Team split (3 people)

> **Updated 2026-10-31:** no fixed owners. The team works as a relay from the queue in issue #32. See `AGENTS.md` → Relay. Yugabyte MEKO added as a required track (#33–#35).

### P1 — Notebook
Canvas + pen pressure + eraser · ruled background + rough-work column · stroke clustering · cluster crops with numbered boxes · red-pen engine (wobbly marks + animated single-stroke font) · question box (handwrite / photo / type) · erase → re-check. **Also owns `/capture` page polish for benchmark samples.**

### P2 — Voice
Live API session via ephemeral token from a Next.js route · mic with echo cancellation + stage-mode push-to-talk · captions · interruption → flush audio, cancel queued notes · `write_note` tool · persona prompt + guardrails + hint ladder phrasing · greeting + name · English/Hinglish switch · proactive/reactive modes + stuck nudge · reconnection. **Owns the echo test + voice audition in hour 0–1.5.**

### P3 — Brain
Flash read/judge prompt + JSON schema · mathjs checker (chain, linear equation, LCM/HCF, vertical layouts) · benefit-of-the-doubt logic · diagnosis + growing category memory + "phir se" · hint-rung state · word-problem hybrid. **Owns running the benchmark and calling the winner.**

---

## 10. Timeline (hackathon clock)

> **Superseded 2026-10-31:** hackCBS is a 24 h sprint and the build is agent-driven, so work runs by dependency milestones (M0–M4 on GitHub). Team target is tonight, Sun 1 Nov 00:00 IST; freeze Sat 22:30 IST. See `docs/DECISIONS.md`.

| Hours | Work |
|---|---|
| 0–1.5 | **All:** repo + types frozen · write benchmark samples · run benchmark (P3) · echo test + voice audition (P2) · clustering spike (P1) |
| 1.5–5.5 | Parallel builds (superseded: see the note above) |
| 5.5–6.5 | **Integration #1:** one fraction problem end-to-end |
| 6.5–9 | Linear equations, word problems, modes, erase/re-check, hint ladder, guardrails, reconnection, language switch, long division (optional) |
| **9** | **FEATURE FREEZE** |
| 9–10.5 | Golden-path rehearsal, latency tuning, bug fixes |
| 10.5–11 | Record backup video |
| 11–12 | Pitch prep + rehearsal |

---

## 11. Demo plan

### Golden path
1. **Fractions** — `3/4 + 1/6`, kid adds across (`4/10`). Shows: live catch, red circle, interruption, hint ladder, fix → ticks → *"Shabash!"*
2. **Linear equation** — `3x + 5 = 20`, kid writes `3x = 20 + 5` (sign not flipped). Fixes it, later makes the **same mistake again** → *"Phir se wahi galti!"*
3. **Long division** (optional — only if rock solid at hour 9).

### Safety net
- Rehearsed golden path · automatic Live reconnection (marks + checker keep working without voice) · **backup screen recording**.
- **Run a production build locally** on the demo laptop (`npm run build && npm start`) + **Vercel** deploy for the judges' link + **phone hotspot** as network backup.

---

## 12. Setup

```bash
git clone https://github.com/Marky2813/masterG && cd masterG
npm install
cp .env.example .env.local      # then put your GEMINI_API_KEY in .env.local
npm run dev
```

**Never commit `.env.local`** — it's gitignored. Each teammate makes their own.
