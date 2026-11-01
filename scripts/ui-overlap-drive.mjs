// /learn layout check with a real Masterji (fake mic, real Live + Flash): at a given viewport, type
// a question, write a wrong step with mouse strokes, wait for his reply and board writing, then
// screenshot and report whether any of his red ink lies under a floating panel ([data-overlay]).
//   PUPPETEER_DIR=... BASE=http://localhost:3001 W=1067 H=667 OUT=shot.png npx tsx scripts/ui-overlap-drive.mjs
import { createRequire } from "node:module";
import path from "node:path";
import { GLYPHS, LETTER_GAP, SPACE_W } from "../src/lib/redpen/font.ts";

const require = createRequire(path.join(process.env.PUPPETEER_DIR ?? process.cwd(), "noop.js"));
const puppeteer = require("puppeteer-core");
const BASE = process.env.BASE ?? "http://localhost:3001";
const W = Number(process.env.W ?? 1067), H = Number(process.env.H ?? 667);
const OUT = process.env.OUT ?? "ui.png";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function writeLine(page, text, x, y, s = 3.6) {
  let cx = x;
  for (const ch of text) {
    if (ch === " ") { cx += SPACE_W * s; continue; }
    const g = GLYPHS[ch];
    for (const stroke of g.s) {
      const pts = stroke.map(([gx, gy]) => [cx + gx * s, y + gy * s]);
      await page.mouse.move(pts[0][0], pts[0][1]);
      await page.mouse.down();
      for (const [px, py] of pts.slice(1)) await page.mouse.move(px, py, { steps: 3 });
      await page.mouse.up();
      await sleep(30);
    }
    cx += (g.w + LETTER_GAP) * s;
  }
}

const browser = await puppeteer.launch({
  executablePath: "/usr/bin/google-chrome",
  headless: true,
  args: ["--no-sandbox", "--use-fake-ui-for-media-stream", "--use-fake-device-for-media-stream", "--autoplay-policy=no-user-gesture-required"],
});
try {
  const page = await browser.newPage();
  await page.setViewport({ width: W, height: H });
  const writes = [];
  page.on("request", (r) => {
    if (r.url().includes("/api/log") && r.method() === "POST") {
      try {
        const b = JSON.parse(r.postData() ?? "{}");
        if (/voice\.(write_|turn|draw)/.test(b.type)) writes.push(b.type + " " + JSON.stringify(b.data).slice(0, 140));
      } catch {}
    }
  });
  await page.goto(`${BASE}/learn`, { waitUntil: "networkidle2" });
  await page.addStyleTag({ content: "nextjs-portal{display:none!important}" });
  const [start] = await page.$$("xpath/.//button[contains(., 'Start Masterji')]");
  await start.click();
  await sleep(9000); // greeting
  const input = await page.waitForSelector('input[placeholder^="Sawaal likho"]');
  await input.type("3/4 + 1/6");
  await page.keyboard.press("Enter");
  await sleep(9000);
  await page.screenshot({ path: OUT.replace(".png", "-question.png") });
  // write the wrong step high on the page, where the floating card used to cover his notes
  await writeLine(page, "3/4 + 1/6 = 4/10", W * 0.3, H * 0.28);
  await sleep(28000); // judged after the pen rests, then he talks and writes
  if (process.env.REPEAT) {
    // the same mistake again, lower down: rung 2, where he usually writes the method on the board
    await writeLine(page, "3/4 + 1/6 = 4/10", W * 0.25, H * 0.55);
    await sleep(30000);
  }
  await page.screenshot({ path: OUT });
  // red-pen pixels under any overlay panel
  const result = await page.evaluate(() => {
    const ov = [...document.querySelectorAll("[data-overlay]")].map((e) => e.getBoundingClientRect()).filter((r) => r.width && r.height);
    const c = document.querySelectorAll("canvas")[1]; // overlay canvas: Masterji's ink
    const cr = c.getBoundingClientRect();
    const ctx = c.getContext("2d");
    const sx = c.width / cr.width, sy = c.height / cr.height;
    let under = 0, total = 0;
    const scrollTop = 0;
    for (let y = Math.max(0, -cr.top); y < Math.min(cr.height, innerHeight - cr.top); y += 3)
      for (let x = 0; x < cr.width; x += 3) {
        const d = ctx.getImageData(Math.floor(x * sx), Math.floor(y * sy), 1, 1).data;
        if (d[3] > 100 && d[0] > 150 && d[1] < 110) {
          total++;
          const px = cr.left + x, py = cr.top + y;
          if (ov.some((r) => px >= r.left && px <= r.right && py >= r.top && py <= r.bottom)) under++;
        }
      }
    return { overlays: ov.map((r) => [Math.round(r.left), Math.round(r.top), Math.round(r.width), Math.round(r.height)]), redSamples: total, underPanels: under };
  });
  console.log(JSON.stringify(result));
  console.log(writes.join("\n"));
} finally {
  await browser.close();
}
