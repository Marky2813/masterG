# hackCBS 9.0 submission form: Master G

Copy each block into the form. Everything here is limited to `docs/CLAIMS.md`. Statistics carry their source.

---

## Elevator Pitch (Tagline)

Masterji is your maths teacher's teaching assistant at home: he watches every step a child writes, gives hints instead of answers, and shows the teacher exactly where each child is stuck.

---

## What problem does your project solve?

Maths is learnt in class but practised alone at home, and that practice has three gaps.

1. **No one checks the steps.** A child does ten sums at home, goes wrong at step two of three of them, and nobody notices until the notebook is marked days later. By then the wrong method has been practised ten times.
2. **Shortcuts give answers, not understanding.** A child who is stuck can paste the sum into Google or a chatbot, copy the answer, and move on. The homework is done; the learning isn't.
3. **The teacher can't see each child's gaps.** A teacher with a full class sees final answers, not which step each child keeps getting wrong. So every child gets the same worksheet.

Families who can afford it pay for private tuition to fill this gap. Most children practise with no one beside them.

---

## The Solution and Architecture

**Master G** is a digital notebook with an AI tutor, Masterji, who behaves like a classic Indian tuition teacher: strict, funny, and in Hinglish.

**For the child (NCERT Classes 1–8)**
- The child writes with a stylus (or a finger or mouse). Masterji reads every line as it is written.
- **Right step:** a red tick and a short "shabaash", then he stays quiet.
- **Wrong step:** a red circle on that line, and a spoken hint that climbs a ladder (point → narrow → lead → show). He doesn't give the answer away.
- **Stuck:** he teaches on the board in red pen: the method written line by line (for example LCM by listing multiples), graphs for linear equations with the crossing point computed by code, and counting sticks for small sums.
- The child talks to him by holding a button (push-to-talk), and can type, photograph, paste or hand-write the question. A teacher's whole worksheet can be loaded as a homework queue, and Masterji works through it in order.

**For the teacher and parent**
- A **report card** per session: every step he read with its mark, the mistake types in plain English, hints needed, handwriting remarks, and an AI note on where the child is lacking, with next-worksheet questions whose answers come from our maths checker. Shareable as a link, on WhatsApp, or printable on A4.
- A **class dashboard**: the teacher makes a class and shares a 6-letter code; children join once. The teacher sees every child's sessions live, the mistakes the class shares ("2 of 3 kids added numerators and denominators straight across"), a topic-by-student grid, and an AI "what to reteach" note built from class counts only (no names sent to the AI).

**Architecture**
- **Notebook (Next.js 16, React 19, canvas):** pen strokes are grouped into lines; when the pen rests, a crop of the line is sent to the server.
- **Read and judge: Gemini Flash (`gemini-3.5-flash-lite`).** It reads the handwriting into a maths expression and gives its verdict, mistake type and a handwriting rating, as structured JSON.
- **Maths checker (mathjs):** recomputes every step it can. When the checker can compute a step, the checker's verdict wins over the model's, so a correct step isn't marked wrong because the AI misjudged it. On our 48-sample benchmark: 98% verdict accuracy and 0 false alarms (one writer, one board).
- **Voice: Gemini Live API (`gemini-3.1-flash-live-preview`).** Real-time speech, Hinglish persona. The browser gets a short-lived ephemeral token, so the API key never leaves the server. Masterji acts through tools: write a note, write a working, draw a graph, show counting sticks, set the next question. Each verdict reaches him as a hidden note, and he never judges the maths himself. Code-side guards stop him from writing the final answer early and from echoing internal notes.
- **Red-pen engine:** turns marks and text into animated handwritten strokes, placed so they never sit under the floating panels.
- **Reports and classes:** the report is computed from the session's events; the class store is on the server; every AI summary is logged with the exact facts it was given.
- **Hosting:** an AWS EC2 instance behind Caddy (HTTPS), invite-code gate on the app and every API, and deploys that roll back automatically if the new version doesn't come up.
- Every session is logged (events, step crops, transcripts), so any run can be replayed and debugged.

---

## Public GitHub Repository Link

https://github.com/Marky2813/masterG

---

## Presentation Deck

_(upload the deck file)_

---

## Project Demo Video (Max. 5 minutes) - Public Link

https://www.youtube.com/watch?v=r_-LqMQN29w

---

## Live Hosted Link

https://masterg.akashparashar.dev

Invite code: **masterji-24803d** (enter it once on the invite page). Best on a laptop or tablet; allow the microphone, then press "Start Masterji". Try: type `3/4 + 1/6`, write `3/4 + 1/6 = 4/10`, and see what Masterji does.

---

## Choose the tracks you wish to compete in

- ✅ **Best Use of Gemini API**: Gemini Flash reads and judges every handwritten step; the Gemini Live API is the voice teacher with tool calls; Flash also writes the teacher's report notes.
- ✅ **Best Social Innovation**: affordable, step-by-step maths help at home for children without tuition, in the language they speak, with the teacher kept in the loop.
- ❌ YugabyteDB Exclusive Problem Statement: **don't pick it.** We did not build the YugabyteDB / MEKO memory.
- ❌ Others (Tiger Data, DigitalOcean, Vultr, MongoDB Atlas, Solana, IOMETE): not used.
- Best Beginner Team / Best Girls Team: only if the team qualifies.

---

## What do you think should be the success metrics of the project?

**Trust: Masterji must never call a correct step wrong**
- False-alarm rate: correct steps marked wrong. Target 0. Today: 0 on our 48-sample benchmark.
- Verdict accuracy (today 98% on that benchmark) and time from pen-up to verdict (target ≤ 2 s).

**Learning: does the child think for themselves?**
- Share of mistakes the child fixes after a hint, before Masterji shows the step (the hint ladder records which rung was needed).
- The same mistake type repeating less often across a child's sessions.
- First-try rate per topic rising over weeks; "I don't know" moments falling.

**Teacher value: does the teacher act on it?**
- Reports and dashboards opened per week; worksheets loaded as homework.
- Whether the class's top shared mistake drops after the teacher reteaches it.

**Use**
- Weekly practice sessions and minutes per child; children still practising after 4 weeks.

All of these come from events the app already records per session (steps, verdicts, hint rungs, mistake types).

---

## Who's the ideal user of your solution?

- **The child:** Classes 1–8 (NCERT), practising maths at home on a tablet with a stylus or on a laptop, most comfortable in Hindi or Hinglish, often without anyone at home who can check their maths.
- **The teacher (school or tuition):** sets the homework and wants to see, for each child and the whole class, which step goes wrong, so they can reteach and set better worksheets.
- **The parent:** wants home practice to mean real practice, not copied answers, and a clear report of where their child needs help.

---

## Show the proof that the problem exists.

- **Basic maths is weak, and the gap widens with each class.**
  - **ASER 2024**, rural India: only **30.7%** of Class 5 children could do a simple division (3-digit by 1-digit), and fewer than half of Class 8 children could.
  - **PARAKH Rashtriya Sarvekshan 2024** (NCERT, about 21 lakh students in Classes 3, 6 and 9, December 2024): the national average score in mathematics falls from about **60% in Class 3** to about **37% in Class 9**. Maths was the lowest-scoring subject in Class 9.
- **Families already pay for help outside school.** NSO's Comprehensive Modular Survey: Education 2025 (MoSPI, PIB release 26 Aug 2025): **27.0%** of students were taking private coaching (30.7% urban, 25.5% rural). Average annual spending per student was ₹3,988 in urban areas and ₹1,793 in rural areas, rising to ₹9,950 at urban higher secondary. Help is bought by those who can afford it; the rest practise alone.
- **What we saw building it.** The classic fraction mistake, adding numerators and denominators straight across (3/4 + 1/6 = 4/10), is exactly the kind of error a final-answer check catches too late, and a step-by-step tutor catches at the step.

Sources:
- ASER 2024 (Annual Status of Education Report, Rural), ASER Centre: https://asercentre.org/wp-content/uploads/2022/12/ASER-2024-All-India-ppt-Jan-27-11am.pdf
- PARAKH Rashtriya Sarvekshan 2024 reports, NCERT: https://parakh.ncert.gov.in/prs-reports-2024 (as reported in https://news.careers360.com/parakh-rashtriya-sarvekshan-result-2024-state-govt-schools-sc-st-far-behind-class-3-6-9-maths-science-language-evs-exam-survey)
- NSO CMS: Education 2025, PIB press release, 26 Aug 2025: https://educationforallinindia.com/wp-content/uploads/2025/08/PIB-Press-Release-26-08-2025-NSSO-Comrephensive-Modular-Survey-on-Education.pdf
