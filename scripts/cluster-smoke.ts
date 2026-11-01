// Clustering sanity run: npm run test:cluster
// Synthetic stroke bboxes shaped like real handwriting (notebook units, 60-unit ruled lines).
import { assignIds, clusterStrokes, type ClusterInput } from "../src/lib/notebook/cluster";

let t = 0;
const s = (id: string, x: number, y: number, w: number, h: number, gapMs = 250): ClusterInput => {
  t += gapMs;
  const t0 = t;
  t += 300;
  return { id, bbox: { x, y, w, h }, t0, t1: t };
};

// Line 1 (y≈100–180): stacked fraction 3/4 + 1/6 = 4/10
const line1 = [
  s("3", 100, 100, 22, 30), s("bar1", 92, 136, 40, 4), s("4", 102, 146, 22, 32),
  s("+", 150, 128, 20, 20),
  s("1", 192, 100, 8, 30), s("bar2", 180, 136, 36, 4), s("6", 188, 146, 22, 32),
  s("=", 236, 130, 26, 12),
  s("4b", 284, 100, 22, 30), s("bar3", 278, 136, 50, 4), s("10", 282, 146, 40, 32),
];
// Line 2 (y≈220–300), written after a 2 s pause, starting back at the left: = 9/12 + 2/12
const line2 = [
  s("=2", 96, 252, 26, 12, 2000), s("9", 140, 220, 22, 30), s("bar4", 134, 256, 46, 4), s("12", 136, 266, 40, 32),
  s("+2", 196, 248, 20, 20), s("2", 236, 220, 22, 30), s("bar5", 230, 256, 46, 4), s("12b", 232, 266, 40, 32),
];
// Line 3, a simple linear step on one ruled line (y≈360–392): 3x = 15
const line3 = [s("3x", 100, 360, 40, 32, 2500), s("=3", 156, 372, 26, 12), s("15", 196, 360, 36, 32)];

// Akash's real line from 2026-10-31 (screenshot, notebook units): big gaps between terms, written with pauses.
const wide = [
  s("w3", 225, 430, 60, 85, 0), s("wbar", 205, 500, 110, 60), s("w4", 245, 555, 45, 65),
  s("w+", 398, 450, 70, 35, 2500), s("w1", 565, 390, 10, 65), s("wbar2", 540, 450, 80, 40), s("w6", 578, 485, 40, 70),
  s("w=a", 695, 435, 50, 10, 2000), s("w=b", 710, 458, 35, 12), s("w4b", 822, 348, 60, 75), s("wbar3", 812, 440, 95, 25), s("w10", 830, 485, 80, 65),
];
// The next line, written below with normal spacing.
const below = [s("n=", 200, 730, 40, 12, 3000), s("n9", 260, 690, 40, 60), s("nbar", 250, 755, 70, 8), s("n12", 255, 770, 60, 55)];

let failed = 0;
const check = (name: string, ok: boolean, detail = "") => {
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? "  " + detail : ""}`);
  if (!ok) failed++;
};

const groups = clusterStrokes([...line1, ...line2, ...line3]);
check("three lines -> three clusters", groups.length === 3, `got ${groups.length}: ${groups.map((g) => g.strokeIds.length).join(",")}`);
check("line 1 complete", groups[0]?.strokeIds.length === line1.length);
check("line 2 complete", groups[1]?.strokeIds.length === line2.length);
check("line 3 complete", groups[2]?.strokeIds.length === line3.length);

const wg = clusterStrokes([...wide, ...below]);
check("wide-gapped line = one cluster", wg.length === 2 && wg[0].strokeIds.length === wide.length, `got ${wg.map((g) => g.strokeIds.length).join(",")}`);

// Stable ids: adding a stroke to line 2 keeps ids; erasing line 3 drops one.
let n = 0;
const ids1 = assignIds(groups, new Map(), () => `c${++n}`);
const prev = new Map([...ids1].map(([id, g]) => [id, g.strokeIds]));
const extra = s("=x", 290, 252, 26, 12, 3000);
const ids2 = assignIds(clusterStrokes([...line1, ...line2, extra, ...line3]), prev, () => `c${++n}`);
check("ids stable after adding a stroke", [...ids2.keys()].sort().join() === [...ids1.keys()].sort().join());
const ids3 = assignIds(clusterStrokes([...line1, ...line2]), prev, () => `c${++n}`);
check("erasing a line drops exactly its cluster", ids3.size === 2 && [...ids3.keys()].every((k) => ids1.has(k)));

// ---- fraction bar drawn after a pause (log 2026-11-01T04-47-56-a3hy, cluster boxes from the log) ----
// "3x6 + 5x7" (x 798-1188, y 620-688), a pause, then the bar (y 720) and "42" under it: ONE step.
const num = [s("f3", 800, 622, 40, 60, 2500), s("fx", 850, 640, 30, 30), s("f6", 890, 620, 40, 62), s("f+", 960, 635, 40, 40), s("f5", 1030, 622, 40, 60), s("fx2", 1080, 630, 30, 30), s("f7", 1120, 620, 60, 50)];
const barDen = [s("fbar", 840, 720, 316, 8, 2000), s("f4", 950, 735, 45, 55), s("f2", 1000, 735, 45, 55)];
const fg = clusterStrokes([...num, ...barDen]);
check("stacked fraction with a gap above the bar = one step", fg.length === 1, `got ${fg.map((g) => g.strokeIds.join(" ")).join(" | ")}`);

// Must NOT change: two separate lines from the same log (c7 "6x = -14", c8 "x = -14/6" right under it,
// 11 units apart). c8's bar already has its numerator touching it, so it doesn't reach up to c7.
const c7 = [s("g6x", 736, 131, 60, 70, 3000), s("g=", 820, 160, 40, 14), s("g-", 880, 165, 20, 6), s("g14", 905, 131, 56, 72)];
const c8 = [s("hx", 790, 222, 40, 40, 3000), s("h=", 850, 235, 40, 14), s("h-14", 900, 216, 70, 44), s("hbar", 895, 266, 90, 8), s("h6", 920, 280, 40, 60), s("h=2", 1010, 260, 40, 14), s("h-7", 1080, 218, 50, 44), s("hbar2", 1075, 266, 80, 8), s("h3", 1095, 280, 40, 60)];
const g78 = clusterStrokes([...c7, ...c8]);
check("next line with its own fractions stays a separate step", g78.length === 2, `got ${g78.map((g) => g.strokeIds.length).join(",")}`);

// Must NOT change: an underline under an answer (nothing below it) stays as it was.
const ans = [s("ux", 300, 400, 40, 40, 3000), s("u=", 350, 412, 30, 12), s("u3", 395, 398, 35, 45)];
const under = s("uline", 290, 470, 150, 6, 1500);
const gu = clusterStrokes([...ans, under]);
check("underline (nothing below) does not join the line above", gu.length === 2, `got ${gu.map((g) => g.strokeIds.length).join(",")}`);

// Must NOT change: the next line starting with "=" (short strokes, not a bar) under the previous line.
const prevL = [s("p3", 300, 500, 40, 60, 3000), s("p+", 350, 515, 30, 30), s("p4", 390, 500, 40, 60)];
const nextL = [s("n=a", 300, 585, 40, 6, 2500), s("n=b", 300, 597, 40, 6), s("n7", 360, 580, 40, 60)];
const gn = clusterStrokes([...prevL, ...nextL]);
check('next line starting with "=" stays a separate step', gn.length === 2, `got ${gn.map((g) => g.strokeIds.length).join(",")}`);

if (failed) {
  console.log(`\n${failed} failed`);
  process.exit(1);
}
console.log("\nall passed");
