// npm run test:classroom: class roll-ups (classOverview) and the file store, offline.
// Unit test only: reports here are constructed to exercise the logic, never shown in the app.
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { CODE_RE, classFacts, classOverview, normalizeCode, randomCode, type ClassInfo, type SessionDoc } from "../src/lib/classroom/model";
import type { Report, ReportQuestion } from "../src/lib/report/model";

let failed = 0;
const ok = (cond: boolean, what: string) => {
  console.log(`${cond ? "PASS" : "FAIL"}  ${what}`);
  if (!cond) failed++;
};

const q = (text: string, steps: [string, "c" | "w", string?][], k: ReportQuestion["k"] = "chain"): ReportQuestion => ({
  q: text,
  k,
  t0: 0,
  t1: 0,
  st: steps.map(([t, s, c], i) => ({ id: `${text}-${i}`, t, s, y: i * 50, a: i * 1000, ...(s === "w" || c ? { w: 1 as const } : {}), ...(c ? { c } : {}) })),
});
const rep = (t0: number, qs: ReportQuestion[]): Report => ({ v: 1, t0, t1: t0 + 5 * 60000, qs });
const sess = (id: string, studentId: string, r: Report): SessionDoc => ({ id, studentId, report: r, updated: r.t1 });

const NOW = Date.UTC(2026, 10, 1, 4, 0);
const info: ClassInfo = {
  code: "ABC234",
  name: "6B Maths",
  grade: "6",
  created: NOW - 86400000,
  students: [
    { id: "kid-aaaaaaaa", name: "Aarav", roll: "1", joined: NOW - 86400000 },
    { id: "kid-bbbbbbbb", name: "Diya", joined: NOW - 86400000 },
    { id: "kid-cccccccc", name: "Kabir", joined: NOW - 86400000 },
  ],
};
const sessions: SessionDoc[] = [
  // Aarav: added across, then fixed it; equation first try. Second session: added across again, unfinished.
  sess("s1", "kid-aaaaaaaa", rep(NOW - 3600000, [q("3/4 + 1/6", [["4/10", "c", "add_across"], ["9/12 + 2/12", "c"], ["11/12", "c"]]), q("3x + 5 = 20", [["3x = 15", "c"], ["x = 5", "c"]], "equation")])),
  sess("s2", "kid-aaaaaaaa", rep(NOW - 600000, [q("2/5 + 1/3", [["3/8", "w", "add_across"]])])),
  // Diya: added across ×3 in one sum (needs attention)
  sess("s3", "kid-bbbbbbbb", rep(NOW - 1200000, [q("1/2 + 1/3", [["2/5", "w", "add_across"], ["2/5", "w", "add_across"], ["2/6", "w", "add_across"]])])),
  // an empty session (opened /learn, wrote nothing) is ignored
  sess("s4", "kid-cccccccc", rep(NOW - 100000, [])),
  // a session from someone not on the roster is ignored
  sess("s5", "kid-zzzzzzzz", rep(NOW, [q("7 + 5", [["12", "c"]])])),
];

const o = classOverview(info, sessions, NOW);
const row = (name: string) => o.rows.find((r) => r.student.name === name)!;
ok(CODE_RE.test(randomCode()) && normalizeCode(" abc-234 ") === "ABC234", "class codes: 6 readable letters, normalized");
ok(o.totals.students === 3 && o.totals.active === 2 && o.totals.sessions === 3, `totals: 3 joined, 2 practised, 3 sessions (got ${JSON.stringify(o.totals)})`);
ok(row("Aarav").sessions === 2 && row("Aarav").attempted === 3 && row("Aarav").solved === 2, "Aarav: 2 sessions, 2 of 3 solved");
ok(JSON.stringify(row("Aarav").trend) === JSON.stringify([0.5, 0]), `Aarav trend per session: [0.5, 0] (got ${JSON.stringify(row("Aarav").trend)})`);
ok(row("Diya").attention === "numerator aur denominator dono add kar diye ×3" || /×3$/.test(row("Diya").attention ?? ""), `Diya flagged for a repeated mistake (${row("Diya").attention})`);
ok(row("Kabir").sessions === 0 && row("Kabir").lastActive === null && !row("Kabir").attention, "Kabir: joined, no practice, empty session ignored");
ok(o.mistakes.length === 1 && o.mistakes[0].id === "add_across" && o.mistakes[0].kids.length === 2 && o.mistakes[0].count === 5, `class mistakes: add_across, 2 kids, 5 times (got ${JSON.stringify(o.mistakes.map((m) => [m.id, m.kids.length, m.count]))})`);
ok(o.mistakes[0].example?.t === "4/10", "mistake carries a real example step");
ok(o.grid["kid-aaaaaaaa"]["Adding / subtracting fractions"].outcome === "unfinished" && o.grid["kid-aaaaaaaa"]["Adding / subtracting fractions"].n === 2, "grid keeps the latest outcome per topic (fractions: unfinished, 2 sums)");
ok(o.grid["kid-aaaaaaaa"]["Linear equations"].outcome === "first_try", "grid: equations first try");
ok(o.topics[0] === "Adding / subtracting fractions", "topics ordered by how much the class practised them");
const f = classFacts(info, o);
ok(!JSON.stringify(f).includes("Aarav") && !JSON.stringify(f).includes("Diya") && f.mistakes[0].kids === 2, "class facts for the AI carry counts, no names");

// store, in a throwaway folder
(async () => {
  const dir = await mkdtemp(path.join(os.tmpdir(), "masterg-classroom-"));
  const cwd = process.cwd();
  process.chdir(dir);
  try {
    const store = await import("../src/lib/classroom/store");
    const { info: made, key } = await store.createClass({ name: "7A", grade: "7" });
    ok(CODE_RE.test(made.code) && key.length >= 20, "createClass: code and teacher key");
    ok((await store.checkKey(made.code, key)) !== null && (await store.checkKey(made.code, key + "x")) === null && (await store.checkKey(made.code, null)) === null, "teacher key checked by hash");
    const doc = await store.getClass(made.code);
    ok(!!doc && !JSON.stringify(doc).includes(key), "the key itself is never stored");
    const [a, b] = await Promise.all([store.joinClass(made.code, "Aarav", "1"), store.joinClass(made.code, "Aarav", "2")]);
    ok(a.id !== b.id && (await store.getClass(made.code))!.students.length === 2, "two kids with the same name joining at once: two students");
    const again = await store.joinClass(made.code, "Aarav K", "1", a.id);
    ok(again.id === a.id && (await store.getClass(made.code))!.students.length === 2, "re-joining from the same device updates, doesn't duplicate");
    await store.putSession(made.code, a.id, "2026-11-01T05-00-00-abcd", rep(NOW, [q("7 + 5", [["12", "c"]])]));
    await store.putSession(made.code, a.id, "2026-11-01T05-00-00-abcd", rep(NOW, [q("7 + 5", [["12", "c"]]), q("8 - 3", [["5", "c"]])]));
    const list = await store.listSessions(made.code);
    ok(list.length === 1 && list[0].report.qs.length === 2, "the same session is replaced, not duplicated");
    let threw = 0;
    for (const bad of [
      () => store.putSession(made.code, "kid-notinclass", "2026-11-01T05-00-00-zzzz", rep(NOW, [])),
      () => store.putSession(made.code, b.id, "2026-11-01T05-00-00-abcd", rep(NOW, [])), // someone else's session id
      () => store.putSession(made.code, a.id, "../../etc", rep(NOW, [])),
      () => store.putSession(made.code, a.id, "2026-11-01T05-00-00-yyyy", { not: "a report" }),
      () => store.getClass("../x"),
    ])
      await bad().then(() => {}, () => threw++);
    ok(threw === 5, `rejects: stranger, someone else's session, path tricks, non-reports, bad codes (${threw}/5)`);
  } finally {
    process.chdir(cwd);
    await rm(dir, { recursive: true, force: true });
  }
  if (failed) process.exit(1);
})();
