// Classroom: a teacher's class, the kids who joined it, and their practice sessions.
// Pure types and roll-ups (no fs, no DOM), shared by the API routes, the dashboard and the smoke test.
// Every number on the dashboard is computed here from real session reports (src/lib/report/model.ts).
import { categoryLabel, outcomeOf, summarize, topicOf, type Outcome, type Report } from "../report/model";

export interface Student {
  id: string; // random, kept on the kid's device; tells two Aaravs apart
  name: string;
  roll?: string;
  joined: number; // epoch ms
}

export interface ClassInfo {
  code: string; // 6 letters, shared with the kids
  name: string; // "6B Maths"
  grade?: string; // "6"
  school?: string;
  created: number;
  students: Student[];
}

// What the server keeps: the class plus a hash of the teacher's key (never the key itself).
export interface ClassDoc extends ClassInfo {
  keyHash: string;
}

export interface SessionDoc {
  id: string; // the /learn session id
  studentId: string;
  report: Report;
  updated: number;
}

// ---------- codes and ids ----------

const CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"; // no 0/O, 1/I/L: read aloud in a classroom
export const CODE_RE = /^[A-HJ-NP-Z2-9]{6}$/;
export const ID_RE = /^[A-Za-z0-9_-]{8,64}$/;

export function randomCode(rand: () => number = Math.random): string {
  let s = "";
  for (let i = 0; i < 6; i++) s += CODE_ALPHABET[Math.floor(rand() * CODE_ALPHABET.length)];
  return s;
}

export const normalizeCode = (s: string) => s.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6);

export const cleanName = (s: unknown, max = 40) => (typeof s === "string" ? s.replace(/\s+/g, " ").trim().slice(0, max) : "");

// ---------- roll-ups ----------

export interface StudentRow {
  student: Student;
  sessions: number;
  lastActive: number | null;
  minutes: number;
  attempted: number;
  solved: number;
  firstTry: number;
  checkable: number;
  firstTryRate: number | null;
  wrongSteps: number;
  stuck: number;
  topMistake?: { id: string; label: string; count: number };
  // per session, oldest first: share of checkable sums solved first try (null = nothing checkable)
  trend: (number | null)[];
  attention: string | null; // why the teacher should look, or null
}

export interface ClassMistake {
  id: string;
  label: string;
  count: number; // steps with this mistake, whole class
  kids: string[]; // student ids who made it
  example?: { q: string; t: string }; // one real wrong step
}

export type Cell = { outcome: Outcome; n: number }; // the most recent outcome on that topic, and how many sums

export interface ClassOverview {
  rows: StudentRow[];
  mistakes: ClassMistake[];
  topics: string[];
  grid: Record<string, Record<string, Cell>>; // studentId -> topic -> cell
  totals: { students: number; active: number; sessions: number; attempted: number; solved: number; firstTryRate: number | null };
}

const DAY = 24 * 60 * 60 * 1000;

// One student's sessions merged into a single report (questions in time order) for the totals.
export function mergeReports(reports: Report[]): Report | null {
  if (!reports.length) return null;
  const sorted = [...reports].sort((a, b) => a.t0 - b.t0);
  return { v: 1, t0: sorted[0].t0, t1: Math.max(...sorted.map((r) => r.t1)), qs: sorted.flatMap((r) => r.qs) };
}

const hasWork = (r: Report) => r.qs.some((q) => q.st.length || q.q);

export function classOverview(info: ClassInfo, sessions: SessionDoc[], now = Date.now()): ClassOverview {
  const byStudent = new Map<string, SessionDoc[]>();
  for (const s of sessions) {
    if (!hasWork(s.report)) continue;
    const list = byStudent.get(s.studentId) ?? [];
    list.push(s);
    byStudent.set(s.studentId, list);
  }

  const mistakes = new Map<string, ClassMistake>();
  const grid: ClassOverview["grid"] = {};
  const topicSet = new Map<string, number>(); // topic -> sums attempted, for column order

  const rows: StudentRow[] = info.students.map((student) => {
    const mine = (byStudent.get(student.id) ?? []).sort((a, b) => a.report.t0 - b.report.t0);
    const merged = mergeReports(mine.map((s) => s.report));
    const sum = merged ? summarize(merged) : null;
    grid[student.id] = {};
    if (merged) {
      merged.qs.forEach((q, i) => {
        if (!q.q && !q.st.length) return;
        const topic = q.q ? topicOf(q.q, q.k) : "Free practice";
        topicSet.set(topic, (topicSet.get(topic) ?? 0) + 1);
        const prev = grid[student.id][topic];
        grid[student.id][topic] = { outcome: sum!.outcomes[i], n: (prev?.n ?? 0) + 1 };
        for (const st of q.st) {
          if (!st.w || !st.c) continue;
          const m = mistakes.get(st.c) ?? { id: st.c, label: categoryLabel(st.c, st.l), count: 0, kids: [] };
          m.count++;
          if (!m.kids.includes(student.id)) m.kids.push(student.id);
          m.example ??= { q: q.q, t: st.t };
          mistakes.set(st.c, m);
        }
      });
    }
    const trend = mine.map((s) => {
      const o = s.report.qs.map(outcomeOf).filter((x) => x !== "unchecked");
      return o.length ? o.filter((x) => x === "first_try").length / o.length : null;
    });
    const lastActive = mine.length ? Math.max(...mine.map((s) => s.report.t1)) : null;
    const top = sum?.mistakes[0];
    let attention: string | null = null;
    if (top && top.count >= 3) attention = `${top.label} ×${top.count}`;
    else if (sum && sum.stuck >= 3) attention = `said “I don’t know” ${sum.stuck} times`;
    else if (sum && sum.attempted >= 3 && sum.solved === 0) attention = "no sum finished yet";
    else if (lastActive !== null && now - lastActive > 7 * DAY) attention = "no practice this week";
    return {
      student,
      sessions: mine.length,
      lastActive,
      minutes: Math.round(mine.reduce((n, s) => n + Math.max(0, s.report.t1 - s.report.t0), 0) / 60000),
      attempted: sum?.attempted ?? 0,
      solved: sum?.solved ?? 0,
      firstTry: sum?.firstTry ?? 0,
      checkable: sum?.checkable ?? 0,
      firstTryRate: sum?.firstTryRate ?? null,
      wrongSteps: sum?.wrongSteps ?? 0,
      stuck: sum?.stuck ?? 0,
      topMistake: top ? { id: top.id, label: top.label, count: top.count } : undefined,
      trend,
      attention,
    };
  });

  const checkable = rows.reduce((n, r) => n + r.checkable, 0);
  return {
    rows,
    mistakes: [...mistakes.values()].sort((a, b) => b.kids.length - a.kids.length || b.count - a.count),
    topics: [...topicSet.entries()].sort((a, b) => b[1] - a[1]).map(([t]) => t),
    grid,
    totals: {
      students: info.students.length,
      active: rows.filter((r) => r.sessions > 0).length,
      sessions: rows.reduce((n, r) => n + r.sessions, 0),
      attempted: rows.reduce((n, r) => n + r.attempted, 0),
      solved: rows.reduce((n, r) => n + r.solved, 0),
      firstTryRate: checkable ? rows.reduce((n, r) => n + r.firstTry, 0) / checkable : null,
    },
  };
}

// The class facts the AI "what to reteach" note may use: counts and labels only, no names.
export function classFacts(info: ClassInfo, o: ClassOverview) {
  return {
    class: info.name,
    grade: info.grade,
    students: o.totals.students,
    practised: o.totals.active,
    sumsAttempted: o.totals.attempted,
    sumsSolved: o.totals.solved,
    firstTryRate: o.totals.firstTryRate === null ? null : Math.round(o.totals.firstTryRate * 100),
    mistakes: o.mistakes.slice(0, 6).map((m) => ({ mistake: m.label, kids: m.kids.length, times: m.count, example: m.example })),
    topics: o.topics.map((t) => {
      const cells = Object.values(o.grid).map((g) => g[t]).filter(Boolean);
      return { topic: t, kids: cells.length, firstTry: cells.filter((c) => c.outcome === "first_try").length, notFinished: cells.filter((c) => c.outcome === "unfinished").length };
    }),
  };
}
