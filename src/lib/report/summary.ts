// Server-only: the "For the teacher" note. One Gemini Flash call, given ONLY the facts computed
// from the session (summarize() in model.ts), told not to add anything else. The practice
// questions it suggests get their answers from our checker, never from the model.
// Never import this from client code: it uses GEMINI_API_KEY.
import { GoogleGenAI, ThinkingLevel } from "@google/genai";
import { referenceAnswer } from "../checker";
import { FLASH_MODEL } from "../gemini/judge";
import { OUTCOME_LABEL, categoryLabel, maxRung, summarize, taughtMethod, topicOf, visibleSteps, type AiSummary, type Report } from "./model";

let client: GoogleGenAI | null = null;
function ai(): GoogleGenAI {
  if (!process.env.GEMINI_API_KEY) throw new Error("GEMINI_API_KEY missing: put it in .env.local");
  return (client ??= new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY }));
}

// The facts the model may use: computed numbers and the kid's own steps. No name (not needed).
export function reportFacts(r: Report) {
  const sum = summarize(r);
  return {
    class: r.cl || "not given",
    sessionMinutes: Math.round(sum.durationMs / 60000),
    questionsAttempted: sum.attempted,
    questionsSolved: sum.solved,
    solvedFirstTry: sum.firstTry,
    questionsWithCheckableAnswer: sum.checkable,
    timesChildSaidIDontKnow: sum.stuck,
    questionsWhereMasterjiShowedTheMethod: sum.taught,
    stepsWithMessyHandwriting: sum.messy,
    mistakeTypes: sum.mistakes.map((m) => ({ mistake: m.label, timesMade: m.count, laterCorrected: m.fixed, inQuestions: m.questions })),
    topicsSolvedCleanly: sum.strengths.map((s) => s.topic),
    topicsWithMistakes: sum.weakTopics.map((w) => w.topic),
    questions: r.qs.map((q, i) => ({
      question: q.q || "(no question set: free practice)",
      topic: topicOf(q.q, q.k),
      outcome: OUTCOME_LABEL[sum.outcomes[i]],
      stepsWritten: visibleSteps(q).map((s) => ({
        wrote: s.t,
        verdict: s.s === "c" ? (s.w ? "correct after fixing" : "correct") : s.s === "w" ? "wrong" : "could not check",
        ...(s.w && s.c ? { mistake: categoryLabel(s.c, s.l) } : {}),
        ...(s.x ? { erasedByChild: true } : {}),
      })),
      highestHintLevel: maxRung(q), // 0 none, 1 point, 2 narrow, 3 lead, 4 shown the step
      saidIDontKnow: q.n ?? 0,
      masterjiShowedMethod: taughtMethod(q),
      seconds: Math.round((q.t1 - q.t0) / 1000),
    })),
  };
}

const PROMPT = `You are writing a short note for a child's maths teacher (or parent) after one home-practice session with Masterji, an AI maths tutor for NCERT Classes 1-8. The teacher will use it to plan the next worksheet.

Use ONLY the facts in DATA below. Do not invent or guess anything that is not there: no other mistakes, no scores, no feelings, no past sessions, no reasons for a mistake beyond its label, no praise for things not in DATA. If DATA shows no mistakes, say so plainly. If there is very little data (one or two steps), say that the session was short and keep it brief. Mistake labels may be in Hinglish; you may translate them into plain English.

Write in simple, clear English for an Indian school teacher. Refer to the child as "the child". No markdown, no emojis.
- lacking: 1-3 sentences on where the child is lacking, citing the mistake types and how often they happened (repeats matter).
- next: 1-2 sentences on what to practise next.
- questions: 3 to 5 practice questions for the next worksheet, at the same level as the questions in DATA, each aimed at one mistake type or weak topic in DATA (if there were no mistakes: one small step harder in the same topics). Write each sum in mathjs syntax, e.g. "2/3 + 1/4", "5/6 - 1/4", "3*x + 5 = 20", "lcm(6, 8)", "2.5 + 1.75". Do not give answers. "why" names the weak spot it targets, in a few words.

DATA:
`;

export async function writeSummary(r: Report): Promise<{ summary: AiSummary; facts: ReturnType<typeof reportFacts>; ms: number }> {
  const facts = reportFacts(r);
  const started = performance.now();
  const res = await ai().models.generateContent({
    model: FLASH_MODEL,
    contents: [{ role: "user", parts: [{ text: PROMPT + JSON.stringify(facts) }] }],
    config: {
      temperature: 0.2,
      responseMimeType: "application/json",
      responseJsonSchema: {
        type: "object",
        properties: {
          lacking: { type: "string" },
          next: { type: "string" },
          questions: {
            type: "array",
            items: { type: "object", properties: { question: { type: "string" }, why: { type: "string" } }, required: ["question", "why"] },
          },
        },
        required: ["lacking", "next", "questions"],
      },
      thinkingConfig: /gemini-2\./.test(FLASH_MODEL) ? { thinkingBudget: 0 } : { thinkingLevel: ThinkingLevel.MINIMAL },
    },
  });
  const out = JSON.parse(res.text ?? "{}") as { lacking?: string; next?: string; questions?: { question?: string; why?: string }[] };
  const qs = (out.questions ?? [])
    .filter((q) => typeof q.question === "string" && q.question.trim())
    .slice(0, 5)
    .map((q) => {
      const text = q.question!.trim();
      let a: string | undefined;
      try {
        a = referenceAnswer(text)?.text; // the checker's answer, or none
      } catch {
        a = undefined;
      }
      return { q: text, why: (q.why ?? "").trim(), ...(a ? { a } : {}) };
    });
  return {
    summary: { lacking: (out.lacking ?? "").trim(), next: (out.next ?? "").trim(), qs, model: FLASH_MODEL },
    facts,
    ms: Math.round(performance.now() - started),
  };
}
