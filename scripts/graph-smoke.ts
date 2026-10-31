// Graph planning smoke test: the line shapes Masterji actually sent in real runs (logs 18-44 to 19-03).
import { graph, planGraph } from "../src/lib/redpen/graph";

let fail = 0;
const check = (name: string, ok: boolean, got: unknown) => {
  console.log(`${ok ? "PASS" : "FAIL"}  ${name} -> ${JSON.stringify(got)}`);
  if (!ok) fail++;
};
const cases: [string[], number | undefined, number | undefined][] = [
  [["8x + 2y = 4", "3x + y = 1"], 1, 1], // used to throw: nothing drawn
  [["4 - 4x", "1 - 3x"], 3, 3],
  [["x+5", "12"], 7, 7],
  [["3x + 5 = 20"], undefined, 5], // one equation -> both sides
  [["y = 2x + 1", "y = -x + 4"], undefined, 1],
  [["3x^2 + 2x + 5", "6"], -1, -1],
  [["2*sin(x) + cos(x)", "5"], 0, undefined], // never meet
];
for (const [lines, markX, want] of cases) {
  const p = planGraph(lines, markX);
  check(`${lines.join(" ; ")} crosses at`, !!p && p.markX === want, p?.markX);
  if (p) {
    const item = graph({ lines: lines.map((expr) => ({ expr })), markX }, { x: 0, y: 0, w: 640, h: 360 }, 1);
    check(`${lines.join(" ; ")} draws strokes`, item.strokes.length > 10, item.strokes.length);
  }
}
check("garbage is rejected", planGraph(["hello world"]) === null, planGraph(["hello world"]));
if (fail) {
  console.error(`${fail} failed`);
  process.exit(1);
}
