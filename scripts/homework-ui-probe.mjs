// Drives the real Homework UI in headless Chrome (mouse + keyboard; the worksheet goes through the
// file input because headless Chrome has no OS file picker). Real /api/worksheet and /api/step calls.
//   npx next dev -p 3003            (another shell)
//   npm i --prefix /some/scratch puppeteer-core@23   (not a repo dependency)
//   NODE_PATH=/some/scratch/node_modules node scripts/homework-ui-probe.mjs [baseUrl]
// Screenshots -> docs/screenshots/homework/, bus events (from the ?debug=1 log) -> stdout.
import { createRequire } from "node:module";
import path from "node:path";
const require = createRequire(path.join(process.env.NODE_PATH ?? ".", "x.js"));
const puppeteer = require("puppeteer-core");

const base = process.argv[2] ?? "http://localhost:3003";
const SHOTS = path.join(process.cwd(), "docs/screenshots/homework");
const WS = path.join(process.cwd(), "benchmark/worksheets");
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const browser = await puppeteer.launch({ executablePath: "/usr/bin/google-chrome", headless: true, args: ["--no-sandbox"] });
const page = await browser.newPage();
await page.setViewport({ width: 1366, height: 820 });
await page.goto(`${base}/learn?debug=1`, { waitUntil: "networkidle0", timeout: 120000 });
await sleep(1000);

const shot = async (name) => {
  await page.screenshot({ path: path.join(SHOTS, `${name}.png`) });
  console.log(`shot ${name}.png`);
};
const events = () => page.$$eval("aside > div", (els) => els.map((e) => e.textContent.replace(/^\d+:\d+:\d+\s*(AM|PM)?\s*/, "")));
const chip = () => page.$eval("form", (f) => f.parentElement.innerText.replace(/\s+/g, " ").trim());
const clickSel = async (sel) => {
  const el = await page.waitForSelector(sel, { timeout: 30000 });
  const b = await el.boundingBox();
  await page.mouse.click(b.x + b.width / 2, b.y + b.height / 2);
};
const clickText = async (tag, text) => {
  const handle = await page.waitForFunction((tag, text) => [...document.querySelectorAll(tag)].find((e) => e.textContent.includes(text)), { timeout: 30000 }, tag, text);
  const b = await handle.asElement().boundingBox();
  await page.mouse.click(b.x + b.width / 2, b.y + b.height / 2);
};
const waitChip = (text) => page.waitForFunction((t) => document.querySelector("form")?.parentElement?.innerText.includes(t), { timeout: 60000 }, text);

// 1. Open the homework panel with the 📄 button.
await clickSel('button[aria-label="Homework"]');
await sleep(300);
await shot("1-homework-panel");

// 2. Load the Class 7 worksheet (real Flash read).
const input = await page.$('input[data-testid="homework-file"]');
await input.uploadFile(path.join(WS, "class7-equations.png"));
await waitChip("Homework 1/");
await sleep(500);
console.log("after load:", await chip());
await shot("2-homework-loaded");

// 3. Step through with the › button, then back with ‹.
await clickSel('button[aria-label="Next homework question"]');
await clickSel('button[aria-label="Next homework question"]');
await waitChip("Homework 3/");
console.log("after next x2:", await chip());
await shot("3-homework-next");
await clickSel('button[aria-label="Previous homework question"]');
await waitChip("Homework 2/");
console.log("after prev:", await chip());

// 4. Open the list and jump to question 1.
await clickText("button", "Homework 2/");
await sleep(300);
await shot("4-homework-list");
await clickText("div.absolute button", "x - 1 = 0");
await waitChip("Homework 1/");
console.log("after jump:", await chip());

// 5. Solve question 1 on the notebook with the mouse: write "x = 1" (real step check by Flash + checker).
const stroke = async (pts) => {
  await page.mouse.move(pts[0][0], pts[0][1]);
  await page.mouse.down();
  for (const [x, y] of pts.slice(1)) await page.mouse.move(x, y, { steps: 6 });
  await page.mouse.up();
  await sleep(120);
};
const X = 420, Y = 330;
await stroke([[X, Y], [X + 40, Y + 50]]); // x
await stroke([[X + 40, Y], [X, Y + 50]]);
await stroke([[X + 75, Y + 18], [X + 115, Y + 18]]); // =
await stroke([[X + 75, Y + 34], [X + 115, Y + 34]]);
await stroke([[X + 145, Y + 8], [X + 155, Y], [X + 155, Y + 52]]); // 1
const verdict = await page
  .waitForFunction(() => [...document.querySelectorAll("aside > div")].some((e) => e.textContent.includes('"status"')), { timeout: 60000 })
  .then(() => true)
  .catch(() => false);
await sleep(800);
console.log("verdict arrived:", verdict, "| verdict event:", (await events()).find((e) => e.startsWith("verdict"))?.slice(0, 160));
console.log("after solving q1:", await chip());
await clickText("button", "Homework 1/");
await sleep(300);
await shot("5-homework-solved-q1");
await page.keyboard.press("Escape");
await clickText("button", "Homework 1/");

// 6. The single-question flow still works with homework loaded: type a question.
await clickSel("form button[title='Change the question']");
await page.evaluate(() => {
  const i = document.querySelector("form input");
  i.select();
});
await page.keyboard.press("Backspace");
await page.keyboard.type("3/4 + 1/6");
await page.keyboard.press("Enter");
await waitChip("Homework –/");
console.log("typed own question:", await chip());
await shot("6-typed-question-with-homework");

// 7. Close it and load homework from pasted text instead.
await clickSel('button[aria-label="Close homework"]');
await clickSel('button[aria-label="Homework"]');
await clickSel("textarea");
await page.keyboard.type("Maths HW (Class 6)\n1. 2/3 + 1/4\n2. 5/6 - 1/3\n3. Find the HCF of 12 and 18\n4. Draw a rectangle of sides 3 cm and 4 cm\n5. A ribbon is 3/4 m long. Riya cuts 1/3 m from it. How much is left?");
await shot("7-homework-paste-text");
await clickText("button", "Padho");
await waitChip("Homework 1/");
await clickText("button", "Homework 1/");
await sleep(300);
console.log("after paste:", await chip());
await shot("8-homework-from-text");

console.log("\nBUS EVENTS (newest first):");
for (const e of await events()) if (/question/.test(e)) console.log("  " + e.slice(0, 260));
await browser.close();
