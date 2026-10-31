# Launch plan (after the hackathon): limited users, invite codes

Nothing here is built. It is a plan ("a later thing", Akash). Numbers marked (estimate) are estimates.

## 1. Deploy on Vercel

1. Confirm `npm ci && npm run build` passes on a clean checkout.
2. Import the repo in Vercel (Next.js preset). No custom server.
3. Env vars (server only; none may be `NEXT_PUBLIC_`):
   - `GEMINI_API_KEY`: a key made only for this launch, with a spend cap in Google Cloud.
   - `GEMINI_FLASH_MODEL`, `GEMINI_LIVE_MODEL`: optional pins; defaults are in code.
   - `DATABASE_URL` (YugabyteDB, section 5) and `INVITE_SECRET` (signs the code cookie).
   - `MEKO_API_KEY`, `MEKO_ENDPOINT`: only if memory is built.
   - `NEXT_PUBLIC_MASTERJI_VOICE`: optional, public, not a secret.
4. **Known gap:** `src/lib/log/server.ts` writes to local `logs/`. Vercel's filesystem is read-only, so logging turns off silently. Replace it with a database table before launch.
5. Smoke test the preview URL with the Wacom, a real microphone and a phone hotspot. The Live API needs HTTPS, which Vercel gives.
6. Rollback: promote the previous deployment in Vercel.

## 2. Cost per session (estimate)

Measured from one real session (log `2026-10-31T20-06-47-7x1t`, about 7 minutes): 6 step judgements, 4 question-related events, 23 push-to-talk turns, one Live voice session open throughout. One session is one sample.

- Flash calls: about 10 per session (estimate).
- Live audio: about 7 minutes of session, audio in and out.
- **Dollar cost per session: not known.** The ledger in `docs/SPIKES.md` records calls, not cost. Price per Flash call and per Live audio minute: `[source needed: Google AI pricing page, dated]`.
- Formula: `cost = flash_calls x flash_price + live_minutes x live_price`. Fill it in from the provider's page, then check against the usage dashboard after a 20-session pilot.
- The Live session is likely the main cost (audio for the whole session); Flash step calls are small by comparison (estimate).

## 3. Invite codes

Goal: a small, known set of families and tuition teachers, each code with a hard cap.

Table `invite_codes`:

| Column | Notes |
|---|---|
| `code` (PK) | 8 random characters, no look-alikes, stored hashed |
| `label` | who it is for, e.g. "Sharma tuition, batch A" |
| `max_sessions` | e.g. 10 |
| `max_minutes` | total Live minutes, e.g. 60 |
| `used_sessions`, `used_minutes` | updated when a token is issued and when a session ends |
| `expires_at` | e.g. 14 days |
| `revoked` | kill switch |
| `parent_consent_at` | set when consent is recorded |

Flow: the landing page asks for a code. The server checks it and sets a signed, HttpOnly cookie with the code id and a session id. Every API route reads the cookie.

Starting limits (tune after the pilot):

| Route | Limit |
|---|---|
| `/api/live-token` | Valid code needed. Refuse when sessions or minutes are used up. One active session per code. At most 3 tokens a minute per code. |
| `/api/step` | 12 a minute and 300 a session per code. Cap image size. |
| `/api/question` | 6 a minute and 40 a session per code. Cap image size. |
| `/api/log` | Cookie required, body size capped. |
| `/api/samples` | Benchmark tool. Switch off in production. |

Counters live in a shared store (database table or Redis). In-process memory does not work on Vercel serverless.

## 4. Abuse and cost guards

- Monthly budget and alerts in Google Cloud on the launch key. A global daily session cap in the app, with a polite "come back tomorrow".
- Rate limit the code-check endpoint per IP. Lock a code for a while after 5 bad tries.
- Idle timeout: end the Live session after 2 minutes with no pen and no speech.
- Maximum session length 30 minutes. Live sessions end about every 10 minutes, so a reconnect must count toward `max_minutes`, not reset it.
- Images: PNG only, size limit.
- Treat text read from images as data, never as instructions. The checker stays authoritative. No keys or codes in prompts.
- Kill switch: an env flag that disables `/api/live-token`.

## 5. Storage: YugabyteDB

YugabyteDB is Postgres-compatible, so use a standard Postgres client. It fits the Yugabyte track and can sit beside MEKO if access arrives. Tables: `invite_codes`, `sessions` (code id, start, end, minutes), `step_events` (category, verdict, step text; no image), `consents`. The report and homework queue (open PRs, not merged) would use the same database. Keep SQL portable until Yugabyte access exists.

## 6. Privacy for children

- **Consent first.** A parent or teacher enters the code and accepts a consent screen before a child uses it. Store the time. Check India's Digital Personal Data Protection Act 2023 rules on children's data with a lawyer before launch `[source needed]`.
- **No audio is stored.** True today: `src/lib/log/server.ts` logs transcripts, not audio.
- **What the logs hold today:** voice transcripts (both sides), step crops as PNG (the child's handwriting), question images, verdicts and categories. Masterji asks the child's name, so transcripts can contain it.
- **Launch rule:** in production, store verdict, category, step text and timestamps only. No PNGs, no transcripts.
- **Retention:** raw events 30 days, then delete. Report data until the family asks for deletion. A "delete my data" action per code.
- **Third party:** images and audio go to Google's Gemini API. Say so on the consent screen. Check the paid tier's data-use terms `[source needed]`.
- No ads, no identifying analytics, no sharing beyond the family and the teacher they name.

## 7. Launch checklist

- [ ] `npm run check` exits 0 on `main`; production build runs
- [ ] Vercel project, env vars, spend cap on the Gemini key
- [ ] Logging off the local disk; no PNGs or transcripts stored in production
- [ ] `invite_codes`, signed cookie, limits on the three routes; tested with a used-up, an expired and a revoked code
- [ ] Consent screen and data-deletion action
- [ ] Reconnect after 10 minutes tested live
- [ ] 20-session pilot with 3-5 families; real cost per session written into this file
- [ ] Support contact on the page and a way to report a wrong verdict
- [ ] Kill switch tested
- [ ] `docs/CLAIMS.md` reconciled against what is live
