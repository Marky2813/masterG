# Pitch: MasterG (for the video and the sales story)

Everything here is limited to what `docs/CLAIMS.md` supports. Where a number would help, it says `[source needed]`. Do not fill those in without a source. Features marked "in progress" are not finished.

## One line

Masterji is your maths teacher's teaching assistant at home: he checks every step your child writes, never just gives the answer, and shows the teacher where the child is stuck.

## The problem

1. **Practice alone at home has no feedback.** A child does ten sums, gets three wrong at step two, and nobody sees it until the notebook is marked days later.
2. **Chatbots give the answer.** Many children paste a sum into a chatbot or Google, copy the result, and move on. The sum is done. The learning is not. `[source needed]` for how common this is.
3. **Teachers are blind to each child's gaps.** A teacher with a full class sees final answers. They do not see which step each child gets wrong again and again, so worksheets are the same for everyone.

## The solution

The child learns from the teacher in class. At home they write on a notebook with a stylus (or pen on a tablet) and Masterji watches.

- Right step: he stays quiet and ticks it.
- Wrong step: he circles the exact part in red, says what is off, and gives a hint. Not the answer.
- Stuck: he teaches the method on the board in red pen, in Hinglish, like a tuition teacher.

Next, so the teacher can act (**in progress, not merged; say "we are building it"**):

- A shareable report of where each child is weak.
- A "homework from the teacher" queue, so home practice follows what was taught in class.

## Why it is different

| Others | Masterji |
|---|---|
| Check the final answer | Checks every step, as it is written |
| Give the answer when asked | Climbs a hint ladder: point, narrow, lead, show |
| Show a typed explanation | Writes the method on the board in red pen; draws graphs for equations; counts with sticks for small sums |
| English-only, text-first | Speaks Hinglish (or English), by voice, like a classroom teacher |
| Parent sees a score | Teacher gets a report they can act on (in progress) |
| AI may call a correct step wrong | A maths checker re-computes each step it can; where it can compute, the checker wins. 0 false alarms on our 48-sample test (one writer, one board) |

## Who pays

- **Parents** of children in NCERT Classes 1-8 who want home practice to be more than copying. Individual subscription or per child.
- **Tuition teachers** who want to see each student's gaps and set targeted homework.
- **Schools** that want a home-practice companion that follows what was taught. Longer sales cycle.

Price points: not decided. `[source needed]` for willingness to pay. Suggested first step: ask 10 parents and 5 tuition teachers and write down what they say.

## Video beat sheet (30-60 s)

| Sec | Picture | Voice-over / line |
|---|---|---|
| 0-5 | Kid copies an answer from a chatbot screenshot on a phone. Notebook full of right answers. | "The sum is done. Did she learn it?" |
| 5-10 | Teacher at a whiteboard, then a child at home alone, stuck. | "Learning happens in class. Practice happens alone." |
| 10-20 | Screen capture: kid writes `3/4 + 1/6 = 4/10`. Red circle appears. | "Meet Masterji. He watches every step." |
| 20-30 | Masterji's voice: "Phir se wahi galti?" Kid fixes it. Tick. "Shabash!" | "He gives hints. Not answers." |
| 30-40 | Kid says "kaise?". Red-pen method appears line by line. Then a graph. | "And when she is stuck, he teaches the method, on the board." |
| 40-50 | Report screen (only if merged; otherwise skip). | "The teacher sees exactly where each child is stuck." |
| 50-60 | Logo, tagline. | "MasterG. Your teacher's teaching assistant, at home." |

Do not show the report screen unless it exists and was run. Do not state any statistic.

## Taglines

English
- Your maths teacher's teaching assistant, at home.
- Practise like it is class. Not like it is copy-paste.
- He checks every step. He does not give away the answer.
- Show the teacher where the sum went wrong.

Hinglish
- Masterji dekhte hain har step.
- Jawab nahi, hint milega. Sochna padega!
- Ghar pe bhi, class jaisi padhai.
- Galti kahaan hui, teacher ko pata chalega.
- Copy nahi, samajh ke karo.

## Honest limits to say out loud

- It is a hackathon build. Runs locally, not deployed yet.
- Tested on one writer's handwriting (48 steps).
- It does not remember a child across sessions yet.
- The teacher report and homework queue are in progress.
