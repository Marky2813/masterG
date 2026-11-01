// A stacked fraction written like a child who pauses before the bar: "18 + 35", a 2.5 s pause, then a
// long bar about 30 units lower and "42" under it. Real strokes (mouse) and real Flash: is it ONE step?
//   PUPPETEER_DIR=... BASE=http://localhost:3001 npx tsx scripts/fraction-gap-drive.mjs
import { createRequire } from "node:module";
import path from "node:path";
import { GLYPHS, LETTER_GAP, SPACE_W } from "../src/lib/redpen/font.ts";

const require = createRequire(path.join(process.env.PUPPETEER_DIR ?? process.cwd(), "noop.js"));
const puppeteer = require("puppeteer-core");
const BASE = process.env.BASE ?? "http://localhost:3001";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function text(page, t, x, y, s = 3.6) {
  let cx = x;
  for (const ch of t) {
    if (ch === " ") { cx += SPACE_W * s; continue; }
    const g = GLYPHS[ch];
    for (const st of g.s) {
      const pts = st.map(([gx, gy]) => [cx + gx * s, y + gy * s]);
      await page.mouse.move(...pts[0]); await page.mouse.down();
      for (const p of pts.slice(1)) await page.mouse.move(...p, { steps: 3 });
      await page.mouse.up(); await sleep(30);
    }
    cx += (g.w + LETTER_GAP) * s;
  }
  return cx;
}
const browser = await puppeteer.launch({ executablePath: "/usr/bin/google-chrome", headless: true, args: ["--no-sandbox"] });
try {
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });
  const steps = [];
  page.on("response", async (r) => { if (r.url().includes("/api/step")) try { const j = await r.json(); steps.push(`${j.status} "${j.text}" (${j.source})`); } catch {} });
  await page.goto(`${BASE}/learn`, { waitUntil: "networkidle2" });
  const q = await page.waitForSelector('input[aria-label="Question"]');
  await q.type("3/7 + 5/6"); await page.keyboard.press("Enter"); await sleep(2000);
  const end = await text(page, "18 + 35", 470, 260);
  await sleep(2500); // the child pauses, then draws the bar lower than usual
  const barY = 260 + 26 * 3.6 * 0 + 60; // bar about 30 px below the numerator's bottom
  await page.mouse.move(455, barY); await page.mouse.down();
  for (let x = 455; x <= end + 10; x += 20) await page.mouse.move(x, barY + (x % 3), { steps: 2 });
  await page.mouse.up(); await sleep(200);
  await text(page, "42", 520, barY + 14);
  await sleep(12000);
  const clusters = await page.evaluate(() => document.body.textContent);
  console.log("step checks:", steps.join(" | "));
  await page.screenshot({ path: process.env.OUT ?? "fraction.png", clip: { x: 380, y: 200, width: 520, height: 220 } });
} finally { await browser.close(); }
