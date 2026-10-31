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

// Stable ids: adding a stroke to line 2 keeps ids; erasing line 3 drops one.
let n = 0;
const ids1 = assignIds(groups, new Map(), () => `c${++n}`);
const prev = new Map([...ids1].map(([id, g]) => [id, g.strokeIds]));
const extra = s("=x", 290, 252, 26, 12, 3000);
const ids2 = assignIds(clusterStrokes([...line1, ...line2, extra, ...line3]), prev, () => `c${++n}`);
check("ids stable after adding a stroke", [...ids2.keys()].sort().join() === [...ids1.keys()].sort().join());
const ids3 = assignIds(clusterStrokes([...line1, ...line2]), prev, () => `c${++n}`);
check("erasing a line drops exactly its cluster", ids3.size === 2 && [...ids3.keys()].every((k) => ids1.has(k)));

if (failed) {
  console.log(`\n${failed} failed`);
  process.exit(1);
}
console.log("\nall passed");
