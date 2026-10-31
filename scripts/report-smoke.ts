// npm run test:report: the report recorder, the summary maths and the share-link round trip.
// Unit test only: events here are constructed to exercise the logic, never shown in the app.
import { bus } from "../src/lib/bus";
import { decodeReport, encodeReport, isFinalLine, outcomeOf, summarize, topicOf } from "../src/lib/report/model";
import { snapshot, startReportRecorder } from "../src/lib/report/recorder";
import type { Verdict } from "../src/lib/types";

let failed = 0;
const ok = (cond: boolean, what: string) => {
  console.log(`${cond ? "PASS" : "FAIL"}  ${what}`);
  if (!cond) failed++;
};
const v = (clusterId: string, status: Verdict["status"], text: string, extra: Partial<Verdict> = {}): Verdict => ({
  clusterId,
  status,
  mark: status === "correct" ? "tick" : status === "wrong" ? "circle" : "none",
  text,
  repeatCount: 0,
  hintRung: 0,
  source: "model",
  ...extra,
});
const box = (id: string, y: number, strokeIds: string[] = [`${id}-s`]) => bus.emit("clusterUpdated", { id, bbox: { x: 0, y, w: 100, h: 40 }, imagePng: "", strokeIds });

// final-answer rule
ok(isFinalLine("3/4 + 1/6", "9/12 + 2/12 = 11/12"), "final: 9/12 + 2/12 = 11/12");
ok(!isFinalLine("3/4 + 1/6", "22/24"), "not final: 22/24 is not simplified");
ok(!isFinalLine("3/4 + 1/6", "9/12 + 2/12"), "not final: intermediate");
ok(isFinalLine("3x + 5 = 20", "x = 5"), "final: x = 5");
ok(isFinalLine("3x + 5 = 20", "3x = 15, x = 5") && isFinalLine("3x + 5 = 20", "x = 15/3 = 5"), "final: x = 5 variants");
ok(!isFinalLine("3x + 5 = 20", "2x = 5") && !isFinalLine("3x + 5 = 20", "x = 15"), "not final: 2x = 5, x = 15");
ok(!isFinalLine("3x + 5 = 20", "3x = 15"), "not final: 3x = 15");
ok(topicOf("3/4 + 1/6", "chain") === "Adding / subtracting fractions", "topic: fractions");
ok(topicOf("3x + 5 = 20", "equation") === "Linear equations", "topic: equation");

(async () => {
// recorder: questions with real-shaped events
const stop = startReportRecorder();
// Q1: wrong (added across), "nahi aata", hint climbs, Masterji writes the working, then fixed
bus.emit("questionConfirmed", { text: "3/4 + 1/6", kind: "chain" });
box("c1", 100);
bus.emit("verdict", v("c1", "wrong", "4/10", { category: "add_across", hintRung: 1, handwriting: "messy", handwritingNote: "the 4 looks like a 9" }));
bus.emit("userUtterance", { text: "mujhe nahi aata" });
bus.emit("verdict", v("c1", "wrong", "4/10", { category: "add_across", hintRung: 2, source: "checker" }));
bus.emit("writeLine", { text: "LCM(4, 6) = 12" });
bus.emit("clusterRemoved", { id: "c1" });
await Promise.resolve();
box("c2", 160);
bus.emit("verdict", v("c2", "correct", "9/12 + 2/12", { handwriting: "neat" }));
box("c3", 220);
bus.emit("verdict", v("c3", "correct", "11/12"));
// a half-written line judged, then merged into a longer one: one step, not two
box("c8", 280, ["a"]);
bus.emit("verdict", v("c8", "unsure", "11"));
box("c9", 280, ["b"]);
bus.emit("verdict", v("c9", "correct", "= 11/12"));
bus.emit("clusterRemoved", { id: "c8" });
box("c9", 280, ["a", "b"]);
await Promise.resolve();
// a new question archives the page: every cluster is removed before questionConfirmed arrives
for (const id of ["c2", "c3", "c9"]) bus.emit("clusterRemoved", { id });
// Q2: clean first try
bus.emit("questionConfirmed", { text: "3x + 5 = 20", kind: "equation" });
bus.emit("questionConfirmed", { text: "3x + 5 = 20", kind: "equation" }); // duplicate confirm: same question
box("c4", 300);
bus.emit("verdict", v("c4", "correct", "3x = 15"));
box("c5", 360);
bus.emit("verdict", v("c5", "correct", "x = 5"));
// Q3: two add_across mistakes, never finished (homework field tolerated)
bus.emit("questionConfirmed", { text: "2/5 + 1/3", kind: "chain", homework: { index: 2, total: 5, title: "Fractions" } } as never);
box("c6", 400);
bus.emit("verdict", v("c6", "wrong", "3/8", { category: "add_across", hintRung: 1, categoryLabel: "numerator aur denominator dono add kar diye" } as Partial<Verdict>));
box("c7", 460);
bus.emit("verdict", v("c7", "wrong", "3/8", { category: "add_across", hintRung: 1 }));
await Promise.resolve(); // each user action is its own task in the app
// the kid erases only c7 (single removal: a real erase), then Clear removes the rest of the page at once
bus.emit("clusterRemoved", { id: "c7" });
await Promise.resolve();
for (const id of ["c4", "c5", "c6"]) bus.emit("clusterRemoved", { id });
await Promise.resolve();
// a new question with one mistake on the page: archiving it is not erasing
bus.emit("questionConfirmed", { text: "5/6 - 1/4", kind: "chain" });
box("c10", 600);
bus.emit("verdict", v("c10", "wrong", "4/2", { category: "add_across", hintRung: 1 }));
bus.emit("clusterRemoved", { id: "c10" });
bus.emit("questionConfirmed", { text: "7 + 5", kind: "chain" });
stop();

const r = snapshot()!;
ok(r.qs.length === 5, `5 questions recorded (got ${r.qs.length})`);
ok(r.qs[2].st.find((x) => x.id === "c7")?.x === 1 && !r.qs[2].st.find((x) => x.id === "c6")?.x, `single erase marks the mistake erased; Clear (whole page) does not (${JSON.stringify(r.qs[2].st)})`);
ok(!r.qs[3].st[0].x, "a new question archiving the page doesn't mark its mistake erased");
r.qs.splice(3, 2); // the rest of the checks are about the first three
ok(r.qs[0].st.length === 4 && r.qs[0].st[0].x === 1, `erased wrong step kept, merged half-line dropped, archived steps kept (got ${r.qs[0].st.map((x) => x.t + (x.x ? "(x)" : "")).join(" | ")})`);
ok(!r.qs[0].st.slice(1).some((x) => x.x), "archived correct steps are not marked erased");
ok(r.qs[0].n === 1 && r.qs[0].m?.l === 1, "nahi aata and Masterji's working line counted");
ok(r.qs[0].st[0].r === 2 && r.qs[0].st[0].h === "the 4 looks like a 9", "highest rung and handwriting remark kept");
ok(r.qs[2].hw?.i === 2 && r.qs[2].hw?.n === 5, "homework position carried");
ok(outcomeOf(r.qs[0]) === "fixed", `Q1 fixed (got ${outcomeOf(r.qs[0])})`);
ok(outcomeOf(r.qs[1]) === "first_try", `Q2 first try (got ${outcomeOf(r.qs[1])})`);
ok(outcomeOf(r.qs[2]) === "unfinished", `Q3 unfinished (got ${outcomeOf(r.qs[2])})`);
const s = summarize(r);
ok(s.attempted === 3 && s.solved === 2 && s.firstTry === 1, "summary counts");
ok(s.mistakes.length === 1 && s.mistakes[0].id === "add_across" && s.mistakes[0].count === 3, "mistakes grouped: add_across ×3");
ok(s.mistakes[0].label === "numerator aur denominator dono add kar diye", "category label resolved");
ok(s.strengths.some((x) => x.topic === "Linear equations") && !s.strengths.some((x) => x.topic.includes("fractions")), "strengths: equations, not fractions");

// share link round trip
  const withAi = { ...r, nm: "Aarav", cl: "6", ai: { lacking: "x", next: "y", qs: [{ q: "1/2 + 1/3", why: "lcm", a: "5/6" }], model: "m" } };
  const enc = await encodeReport(withAi);
  const dec = await decodeReport(enc);
  ok(/^[A-Za-z0-9_-]+$/.test(enc), `link data is base64url (${enc.length} chars)`);
  ok(dec.nm === "Aarav" && dec.cl === "6" && dec.qs.length === 3 && dec.ai?.qs[0].a === "5/6", "decode(encode(r)) keeps name, class, questions, AI summary");
  ok(dec.qs[0].st[0].t === "4/10" && dec.qs[0].st[0].c === "add_across" && dec.qs[0].st.every((x) => !x.id), "steps survive, cluster ids stay out of the link");
  ok(JSON.stringify(summarize(dec)) === JSON.stringify(summarize(r)), "same summary after the round trip");
  let threw = false;
  try {
    await decodeReport("bm90LWEtcmVwb3J0");
  } catch {
    threw = true;
  }
  ok(threw, "garbage link data throws (page shows an error, not made-up content)");
  if (failed) process.exit(1);
})();
