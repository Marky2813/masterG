// Server-only: the class "what to reteach" note. One Gemini Flash call over classFacts() (counts and
// mistake labels, no child names). Practice-question answers come from our checker, never the model.
import { noteFromFacts } from "../report/summary";
import type { classFacts } from "./model";

const PROMPT = `You are writing a short note for a maths teacher about their whole class, from the children's home practice with Masterji, an AI maths tutor for NCERT Classes 1-8. The teacher will use it to plan Monday's lesson and the next worksheet.

Use ONLY the facts in DATA below. Do not invent anything that is not there: no other mistakes, no scores, no reasons beyond the mistake labels, no names. If few children practised, say so and keep it brief. Mistake labels may be in Hinglish; translate them into plain English.

Write in simple, clear English for an Indian school teacher. No markdown, no emojis.
- lacking: 1-3 sentences on what the class is getting wrong, citing how many children made each mistake (a mistake many children share matters most).
- next: 1-2 sentences on what to reteach in class first.
- questions: 3 to 5 practice questions for a class worksheet, at the same level as the examples in DATA, each aimed at one shared mistake or weak topic. Write each sum in mathjs syntax, e.g. "2/3 + 1/4", "5/6 - 1/4", "3*x + 5 = 20", "lcm(6, 8)", "7 + 5". Do not give answers. "why" names the weak spot it targets, in a few words.

DATA:
`;

export const writeClassNote = (facts: ReturnType<typeof classFacts>) => noteFromFacts(PROMPT, facts);
