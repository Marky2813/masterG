// End-to-end drive of the teacher report in headless Chrome, with real mouse strokes and real
// Flash verdicts (no mocks): types a question on /learn, writes each step as pen strokes in a
// single-stroke digit font, opens 📋 Report, waits for the AI summary, then screenshots the
// report at phone and desktop width, opens the share link in a fresh profile, and prints A4.
//
//   PUPPETEER_DIR=/path/with/node_modules/puppeteer-core npx tsx scripts/report-drive.mjs
//   (BASE defaults to http://localhost:3002; OUT to docs/screenshots/report; RESHOOT=1 re-shoots only)
//
// Costs: one Flash call per judged step (6 in this scenario) plus one for the summary.
import { createRequire } from "node:module";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { GLYPHS, LETTER_GAP, SPACE_W } from "../src/lib/redpen/font.ts";

const require = createRequire(path.join(process.env.PUPPETEER_DIR ?? process.cwd(), "noop.js"));
const puppeteer = require("puppeteer-core");
const BASE = process.env.BASE ?? "http://localhost:3002";
const OUT = process.env.OUT ?? "docs/screenshots/report";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Whole-page shot with the viewport stretched to the page, so the sticky action bar sits at the
// end (where it rests) instead of floating mid-page. The Next dev badge is hidden in shots.
async function shot(page, file, width, dpr) {
  await page.addStyleTag({ content: "nextjs-portal{display:none!important}" });
  await page.setViewport({ width, height: 844, deviceScaleFactor: dpr });
  await sleep(700);
  const height = await page.evaluate(() => document.documentElement.scrollHeight);
  await page.setViewport({ width, height, deviceScaleFactor: dpr });
  await sleep(700);
  await page.screenshot({ path: path.join(OUT, file) });
  await page.setViewport({ width, height: 844, deviceScaleFactor: dpr });
}

const SCENARIO = [
  { q: "3/4 + 1/6", lines: ["3/4 + 1/6 = 4/10", "9/12 + 2/12", "= 11/12"] },
  { q: "3x + 5 = 20", lines: ["3x = 15", "x = 5"] },
  { q: "2/5 + 1/3", lines: ["3/8"] },
];

// Writes one line of text as mouse strokes, top-left at (x, y) CSS px, `s` px per font unit.
async function writeLine(page, text, x, y, s = 4.2) {
  let cx = x;
  for (const ch of text) {
    if (ch === " ") {
      cx += SPACE_W * s;
      continue;
    }
    const g = GLYPHS[ch];
    if (!g) throw new Error(`no glyph for ${ch}`);
    for (const stroke of g.s) {
      const pts = stroke.map(([gx, gy]) => [cx + gx * s, y + gy * s]);
      await page.mouse.move(pts[0][0], pts[0][1]);
      await page.mouse.down();
      for (const [px, py] of pts.slice(1)) await page.mouse.move(px, py, { steps: 4 });
      await page.mouse.up();
      await sleep(40);
    }
    cx += (g.w + LETTER_GAP) * s;
  }
}

async function main() {
  await mkdir(OUT, { recursive: true });
  const browser = await puppeteer.launch({ executablePath: "/usr/bin/google-chrome", headless: true, args: ["--no-sandbox", "--hide-scrollbars"] });
  // RESHOOT=1: only re-shoot the report from the last run's link in drive-result.json (no Flash calls).
  if (process.env.RESHOOT) {
    process.env.LINK = JSON.parse(await readFile(path.join(OUT, "drive-result.json"), "utf8")).link;
    const p = await browser.newPage();
    await p.goto(process.env.LINK.replace(/^https?:\/\/[^/]+/, BASE), { waitUntil: "networkidle2" });
    await sleep(2500);
    await shot(p, "report-phone.png", 390, 2);
    await shot(p, "report-desktop.png", 1280, 1);
    await p.pdf({ path: path.join(OUT, "report-a4.pdf"), format: "A4", printBackground: true });
    await browser.close();
    return;
  }
  const log = [];
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 860 });
    page.on("response", async (res) => {
      if (!res.url().includes("/api/step")) return;
      try {
        const j = await res.json();
        log.push({ status: j.status, text: j.text, category: j.category, source: j.source, ms: j.ms });
        console.log(`  step: ${j.status} "${j.text}" ${j.category ?? ""} (${j.source}, ${j.ms} ms)`);
      } catch {}
    });
    await page.goto(`${BASE}/learn`, { waitUntil: "networkidle2" });
    await page.waitForSelector('input[placeholder^="Sawaal likho"]');

    for (const { q, lines } of SCENARIO) {
      console.log(`question: ${q}`);
      const change = await page.$('button[title="Change the question"]');
      if (change) await change.click();
      const input = await page.waitForSelector('input[placeholder^="Sawaal likho"]');
      await input.click({ clickCount: 3 });
      await page.keyboard.press("Backspace");
      await input.type(q);
      await page.keyboard.press("Enter");
      await sleep(2000); // the notebook scrolls to a fresh page for the new question
      let y = 300;
      for (const line of lines) {
        const before = log.length;
        await writeLine(page, line, 200, y);
        y += 95;
        const t0 = Date.now();
        while (log.length === before && Date.now() - t0 < 20000) await sleep(250);
        await sleep(3500); // a wrong verdict is held until the pen has been still 2.5 s
      }
    }
    await page.screenshot({ path: path.join(OUT, "learn-desktop.png") });

    const opened = new Promise((r) => browser.once("targetcreated", (t) => r(t.page())));
    const [btn] = await page.$$("xpath/.//button[contains(., 'Report')]");
    await btn.click();
    const report = await opened;
    await report.setViewport({ width: 390, height: 844, deviceScaleFactor: 2 });
    await report.waitForFunction(() => document.body.innerText.includes("For the next worksheet") || document.body.innerText.includes("Couldn't write the summary"), { timeout: 60000 });
    await sleep(1500);
    // Name and class are typed on the report itself.
    await report.type('input[placeholder="write the name"]', "Aarav");
    await report.type('input[placeholder="class"]', "6");
    await sleep(800);
    await shot(report, "report-phone.png", 390, 2);
    await shot(report, "report-desktop.png", 1280, 1);
    await report.pdf({ path: path.join(OUT, "report-a4.pdf"), format: "A4", printBackground: true });
    const link = await report.evaluate(() => window.location.href);
    const text = await report.evaluate(() => document.body.innerText);

    // The share link alone, in a fresh profile (no localStorage): it must render the same report.
    const ctx = await browser.createBrowserContext();
    const fresh = await ctx.newPage();
    await fresh.setViewport({ width: 390, height: 844, deviceScaleFactor: 2 });
    await fresh.goto(link, { waitUntil: "networkidle2" });
    await fresh.waitForFunction(() => document.body.innerText.includes("Every question"), { timeout: 20000 });
    await sleep(1200);
    await fresh.addStyleTag({ content: "nextjs-portal{display:none!important}" });
    await fresh.screenshot({ path: path.join(OUT, "report-shared-link-phone.png") }); // first screen, as a teacher opens it
    const freshText = await fresh.evaluate(() => document.body.innerText);
    const wa = await fresh.evaluate(() => [...document.querySelectorAll("a")].find((a) => a.textContent?.includes("WhatsApp"))?.href ?? "");

    const result = {
      ranAt: new Date().toISOString(),
      steps: log,
      link,
      linkLength: link.length,
      sharedLinkShowsName: freshText.includes("Aarav"),
      sharedLinkHasAiSummary: freshText.includes("For the next worksheet"),
      whatsappHref: wa.slice(0, 400),
      reportText: text,
    };
    await writeFile(path.join(OUT, "drive-result.json"), JSON.stringify(result, null, 2));
    console.log(`link length ${link.length}; shared link shows name: ${result.sharedLinkShowsName}; AI summary in link: ${result.sharedLinkHasAiSummary}`);
  } finally {
    await browser.close();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
