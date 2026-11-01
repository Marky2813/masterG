// End-to-end drive of the teacher dashboard in headless Chrome, with real mouse strokes and real
// Flash verdicts (no mocks, no seeded data): a teacher makes a class on /teacher; three test
// students each join in their own browser profile (/join), solve sums on /learn by writing
// strokes; the dashboard is then screenshotted with the class "What to reteach" note and one
// student's page open.
//
//   PUPPETEER_DIR=/path/with/node_modules/puppeteer-core BASE=http://localhost:3001 npx tsx scripts/classroom-drive.mjs
//   (OUT defaults to docs/screenshots/classroom)
//
// The students are named "Test ..." because a script wrote their strokes; the verdicts are real.
// Costs: one Flash call per judged step (about 9 here) plus one for the class note.
import { createRequire } from "node:module";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { GLYPHS, LETTER_GAP, SPACE_W } from "../src/lib/redpen/font.ts";

const require = createRequire(path.join(process.env.PUPPETEER_DIR ?? process.cwd(), "noop.js"));
const puppeteer = require("puppeteer-core");
const BASE = process.env.BASE ?? "http://localhost:3001";
const OUT = process.env.OUT ?? "docs/screenshots/classroom";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const STUDENTS = [
  { name: "Test Aarav", roll: "1", work: [{ q: "3/4 + 1/6", lines: ["3/4 + 1/6 = 4/10", "9/12 + 2/12", "= 11/12"] }, { q: "3x + 5 = 20", lines: ["3x = 15", "x = 5"] }] },
  { name: "Test Diya", roll: "2", work: [{ q: "2/5 + 1/3", lines: ["3/8"] }, { q: "1/2 + 1/3", lines: ["2/5"] }] },
  { name: "Test Kabir", roll: "3", work: [{ q: "7 + 5", lines: ["12"] }, { q: "1/2 + 1/4", lines: ["2/4 + 1/4 = 3/4"] }] },
];

async function shot(page, file, width, dpr = 1) {
  await page.addStyleTag({ content: "nextjs-portal{display:none!important}" });
  await page.setViewport({ width, height: 900, deviceScaleFactor: dpr });
  await sleep(600);
  const height = await page.evaluate(() => document.documentElement.scrollHeight);
  await page.setViewport({ width, height, deviceScaleFactor: dpr });
  await sleep(600);
  await page.screenshot({ path: path.join(OUT, file) });
  await page.setViewport({ width, height: 900, deviceScaleFactor: dpr });
}

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
  const result = { ranAt: new Date().toISOString(), base: BASE, steps: [], saves: [] };
  try {
    // 1. Teacher makes the class.
    const tctx = await browser.createBrowserContext();
    const teacher = await tctx.newPage();
    await teacher.setViewport({ width: 1280, height: 900 });
    await teacher.goto(`${BASE}/teacher`, { waitUntil: "networkidle2" });
    await shot(teacher, "teacher-home.png", 1280);
    await teacher.type('input[placeholder="6B Maths"]', "6B Maths");
    await teacher.type('input[placeholder="6"]', "6");
    await Promise.all([teacher.waitForNavigation({ waitUntil: "networkidle2" }), teacher.click('button[type="submit"]')]);
    await teacher.waitForFunction(() => document.body.textContent.includes("Class code for students"), { timeout: 20000 });
    const url = teacher.url();
    const code = url.match(/\/teacher\/([A-Z0-9]{6})/)[1];
    result.code = code;
    console.log(`class ${code}`);
    await shot(teacher, "dashboard-empty.png", 1280);

    // 2. Each student joins in their own profile and practises.
    for (const kid of STUDENTS) {
      const ctx = await browser.createBrowserContext();
      const page = await ctx.newPage();
      await page.setViewport({ width: 1280, height: 860 });
      page.on("response", async (res) => {
        const u = res.url();
        try {
          if (u.includes("/api/step")) {
            const j = await res.json();
            result.steps.push({ kid: kid.name, status: j.status, text: j.text, category: j.category, source: j.source, ms: j.ms });
            console.log(`  ${kid.name} step: ${j.status} "${j.text}" ${j.category ?? ""} (${j.source}, ${j.ms} ms)`);
          } else if (u.includes(`/api/class/${code}/session`)) {
            result.saves.push({ kid: kid.name, status: res.status() });
          }
        } catch {}
      });
      await page.goto(`${BASE}/join?c=${code}`, { waitUntil: "networkidle2" });
      await page.waitForFunction(() => document.body.textContent.includes("6B Maths"), { timeout: 15000 });
      await page.type('input[placeholder="Aarav"]', kid.name);
      await page.type('input[placeholder="12"]', kid.roll);
      if (kid === STUDENTS[0]) await shot(page, "join-phone.png", 390, 2);
      await page.setViewport({ width: 1280, height: 860 });
      await Promise.all([page.waitForNavigation({ waitUntil: "networkidle2" }), page.click('button[type="submit"]')]);
      await page.waitForSelector('input[placeholder^="Sawaal likho"]');
      for (const { q, lines } of kid.work) {
        console.log(`${kid.name}: ${q}`);
        const change = await page.$('button[title="Change the question"]');
        if (change) await change.click();
        const input = await page.waitForSelector('input[placeholder^="Sawaal likho"]');
        await input.click({ clickCount: 3 });
        await page.keyboard.press("Backspace");
        await input.type(q);
        await page.keyboard.press("Enter");
        await sleep(2000);
        let y = 300;
        for (const line of lines) {
          const before = result.steps.length;
          await writeLine(page, line, 200, y);
          y += 95;
          const t0 = Date.now();
          while (result.steps.length === before && Date.now() - t0 < 20000) await sleep(250);
          await sleep(3500);
        }
      }
      if (kid === STUDENTS[0]) {
        await page.addStyleTag({ content: "nextjs-portal{display:none!important}" });
        await page.screenshot({ path: path.join(OUT, "learn-in-class.png") });
      }
      await sleep(3000); // the sync sends 2 s after the last checked step
      await page.close(); // pagehide sends the last copy too
      await ctx.close();
    }

    // 3. The teacher's dashboard (it refreshes on its own every 10 s; reload to be sure).
    await teacher.reload({ waitUntil: "networkidle2" });
    await teacher.waitForFunction((n) => document.body.textContent.includes("Every student") && (document.body.textContent.match(/Test /g) ?? []).length >= n, { timeout: 30000 }, STUDENTS.length);
    const [noteBtn] = await teacher.$$("xpath/.//button[contains(., 'Write the AI summary')]");
    if (noteBtn) {
      await noteBtn.click();
      await teacher.waitForFunction(() => document.body.textContent.includes("For the class worksheet") || document.body.textContent.includes("Couldn't write the summary"), { timeout: 60000 });
    }
    await sleep(800);
    await shot(teacher, "dashboard-desktop.png", 1280);
    await shot(teacher, "dashboard-phone.png", 390, 2);
    await teacher.setViewport({ width: 1280, height: 900 });
    const [openBtn] = await teacher.$$("xpath/.//button[normalize-space(.)='Open']");
    if (openBtn) {
      await openBtn.click();
      await sleep(1200);
      const el = await teacher.$("#student-panel");
      await teacher.addStyleTag({ content: "nextjs-portal{display:none!important}" });
      if (el) await el.screenshot({ path: path.join(OUT, "student-panel.png") });
      // one session's full report from the student page
      const opened = new Promise((r) => browser.once("targetcreated", (t) => r(t.page())));
      const [rep] = await teacher.$$("xpath/.//button[contains(., 'Report →')]");
      if (rep) {
        await rep.click();
        const rp = await opened;
        await rp.waitForFunction(() => document.body.textContent.includes("Every question"), { timeout: 20000 });
        result.reportFromDashboard = (await rp.evaluate(() => document.body.innerText)).slice(0, 400);
      }
    }
    result.dashboardText = await teacher.evaluate(() => document.body.innerText);
    await writeFile(path.join(OUT, "drive-result.json"), JSON.stringify(result, null, 2));
    console.log(`saves: ${result.saves.map((s) => s.status).join(",")}`);
  } finally {
    await browser.close();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
