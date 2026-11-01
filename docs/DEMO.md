# Demo: 2-minute golden path for the judges

Verdict first: this script is written from the features on `main` at `67b2293`. Nobody has run it end to end on the demo laptop since #59 merged. Rehearse it once before judging and fix the lines below to match what Masterji really says. Status words: see `docs/CLAIMS.md`.

## Setup (before judges arrive)

- `git switch main && git pull --rebase`, then `npm run build && npm start` (production build). Open `http://localhost:3000/learn`. Chrome, 100 % zoom (120 % placement is untested).
- Wacom board mapped to the browser window. Pen dot visible. Speakers on, volume up. Microphone permitted.
- `.env.local` has a paid `GEMINI_API_KEY` (free tier hits 429 after ~15 calls a minute).
- Phone hotspot ready as network backup.
- Language: Hinglish (default). Push-to-talk: hold Space or the on-screen button.
- Optional second tab: `/learn?debug=1` to show the event log if a judge asks.
- Close other tabs that use the microphone.

## The script (about 2:00)

| Time | Beat | Say / do | Masterji should | If it misbehaves |
|---|---|---|---|---|
| 0:00 | Pitch | Say: "This is Masterji, your maths teacher's teaching assistant at home. The kid learns in class, then practises with him. He checks every step and never just gives the answer." | (nothing yet) | Skip the line if talking over a loud room. |
| 0:10 | Question | Handwrite `3/4 + 1/6` in the question box. | Read it back: "Toh sawaal hai 3/4 + 1/6. Theek hai?" Greet and ask the name. | Read wrong: rewrite it bigger, or type it. Voice silent: press End, then Start. |
| 0:20 | Confirm | Hold Space: "Haan, theek hai. Mera naam Arjun hai." | Use the name. Stay quiet while you write. | Press-to-talk dead: click the on-screen button; check the mic permission. |
| 0:30 | Right step | Write `LCM = 12` on a new line. | Stay quiet. Red tick. Say to judges: "He does not speak when I am right." | Tick missing: wait 3 s after the pen lifts. Still nothing: rewrite bigger. |
| 0:45 | Wrong step | Write the classic error on the next line: `3/4 + 1/6 = 4/10` (adding across). | Red circle on the wrong part. One short scold of the mistake, then rung 1: "Line dobara dekho." | No reaction after 5 s: rewrite bigger and darker. Calls a correct step wrong: rewrite it clearer and tell the team after. |
| 1:00 | Hint, then fix | Hold Space: "Nahi pata." Then erase and write `= 11/12`. | Next rung: circles the wrong part, then a guiding question. After the fix: tick, "Shabash!" | He gives the full answer at once: carry on and say "usually he climbs one rung at a time". |
| 1:20 | Teach the method | Hold Space: "Masterji, LCM kaise nikalte hain?" | Speaks, then writes the working on the board in red (`write_working`): multiples of 4 and 6, LCM 12. | Nothing written: ask again, "board pe likh ke dikhao". Voice stalls: End, Start. |
| 1:40 | Graph | Type or write `3x + 5 = 20`. Say: "Iska graph dikhao." | Draws two lines in red, circles the crossing, says x = 5. | No graph: skip it. Say "graphs are new tonight". Do not retry live. |
| 1:55 | Close | Say: "Every mistake he sees can feed a report for the teacher, so the teacher knows where each kid is stuck." Then open the report (see the segment below). | Wrap up in one line. | |

Notes on beats: the "wrong step" beat should be rehearsed with the exact handwriting you will use. The 48 benchmark samples were one writer on this board.

## Segment: report and homework queue (rehearse it once before showing)

Both run on the overnight build (`overnight/preview`, PR #64). Rehearse once with the stylus and voice before you show it, because they have only been tested offline.

| Beat | Do | Fallback |
|---|---|---|
| Report | Open the shareable report link for the session just run. Point at the mistake categories it shows. "This is what the teacher gets." | Show a screenshot saved from the rehearsal. Label it a rehearsal run. |
| Homework queue | Open the teacher's queue, show one sum set by the teacher, open it in `/learn`. | Skip. |

## Segment: teacher dashboard (rehearse once)

Before judging: make the demo class at `/teacher` on the demo laptop and keep the dashboard tab open. Each teammate joins it from their own phone or laptop (`/join?c=CODE`) and does two or three sums, so the dashboard holds real sessions. Don't seed or fake any.

| Beat | Do | Fallback |
|---|---|---|
| Live sync | The kid's tablet is joined to the class. Solve a sum with one mistake. Switch to the dashboard tab: within about 10 s the kid's row, the mistakes chart and the grid update. | Reload the dashboard. |
| Reteach | Tap "Write the AI summary": "2 of 3 kids added across, reteach common denominators", with worksheet sums whose answers come from our checker. | Show `docs/screenshots/classroom/dashboard-desktop.png` and say it is a test run. |
| One child | Open a child, then a session's Report →. That is the same report a parent gets on WhatsApp. | Skip. |

## Other fallbacks

| Problem | Fix |
|---|---|
| Voice stalls or goes silent | Press End, then Start. The question stays; the session restarts. |
| Voice gives 1008 / "GoAway" after ~10 min | Sessions end at about 10 minutes. Reconnect is untested live: press End, Start. |
| 429 / quota errors | Switch to the backup key; check AI Studio quota. |
| Wi-Fi drops | Phone hotspot. Then backup video. |
| Wrong read of a step | Rewrite the step bigger. Mention the handwriting rating only if he does. |
| Ink hidden behind a panel | Scroll the notebook; keep zoom at 100 %. |
| Everything fails | Play the backup video. |

## Lines to say if asked

- "How does it avoid calling right answers wrong?" The checker computes the step itself. If it can compute, it overrules the model. If it cannot, Masterji stays quiet. On our 48 samples that gave 0 false alarms in three runs. It is not a guarantee.
- "Which models?" Gemini `gemini-3.5-flash-lite` reads and judges steps. `gemini-3.1-flash-live-preview` is the voice. Nothing else is in the live path.
- "Does it remember the child?" Not yet. Cross-session memory (Yugabyte MEKO) is blocked on access.
- "Is it deployed?" Not yet. It runs on this laptop.

## Backup video

Path: not recorded yet. Record after rehearsal; keep it in the repo or the shared drive, never in `/tmp`.

## Don't claim

See `docs/CLAIMS.md`, section "Don't claim". In short: no "never wrong", no learning-gain numbers, no memory across sessions, no report or homework queue unless merged, no deployment.
