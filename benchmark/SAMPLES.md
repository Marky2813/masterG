# Benchmark samples: what to write

48 steps to write on the Wacom at `/capture`. Every label below was checked against `src/lib/checker.ts` (`npx tsx scripts/verify-sample-plan.ts benchmark/sample-plan.json`, exit 0). Mix: 28 correct, 20 wrong, ~10 with deliberately messy digits. See PLAN.md §7 for why.

## Setup
```bash
git switch main && git pull --rebase
npm install
cp .env.example .env.local   # no key needed just to capture
npm run dev                  # then open http://localhost:3000/capture in Chrome
```
Map the Wacom to the browser window in the tablet settings.

## For each row
1. **Write** the *Write this* column on the pad **by hand, the way a kid would** (× and ÷ are fine on paper; mixed fractions as 1½).
2. **Topic** dropdown → the row's topic.
3. **Question** box → the *Question* column.
4. **Previous line** → the *Previous* column. ⚠️ The page auto-fills this from the last correct sample: **clear it when the row's Previous is blank**.
5. **Expected text** → the *Write this* column exactly as shown (mathjs style: `*`, `/`, `(1+1/2)`, `lcm(4, 6)`, `hcf(12, 18)`).
6. **This step is correct** → tick for ✅, untick for ❌ and pick the *Category* (or "other / none fits" when blank).
7. **Save sample.** Undo/Clear if you mess up before saving.

*Messy* column: write those digits deliberately ambiguous. That's how we test benefit-of-the-doubt.

When done: `git switch -c samples && git add benchmark/samples && git commit -m "Add benchmark samples" && git push -u origin samples`, then open a PR (or tell Claude to).

| # | Topic | Question | Previous | Write this | ✅/❌ | Category | Messy |
|---|---|---|---|---|---|---|---|
| 1 | fractions | `3/4 + 1/6` |  | `3/4 + 1/6 = 4/10` | ❌ | add_across |  |
| 2 | fractions | `3/4 + 1/6` |  | `3/4 + 1/6 = 9/12 + 2/12` | ✅ |  |  |
| 3 | fractions | `3/4 + 1/6` | `= 9/12 + 2/12` | `= 11/12` | ✅ |  |  |
| 4 | fractions | `2/3 + 1/5` |  | `2/3 + 1/5 = 3/8` | ❌ | add_across |  |
| 5 | fractions | `2/3 + 1/5` |  | `2/3 + 1/5 = 10/15 + 3/15 = 13/15` | ✅ |  |  |
| 6 | fractions | `5/6 - 1/4` |  | `5/6 - 1/4 = 10/12 - 3/12 = 7/12` | ✅ |  | write the 7 like a 1 |
| 7 | fractions | `5/6 - 1/4` |  | `5/6 - 1/4 = 4/2` | ❌ | add_across |  |
| 8 | fractions | `(1+1/2) + (2+1/3)` |  | `(1+1/2) + (2+1/3) = (3+5/6)` | ✅ |  | write as mixed fractions: 1½ + 2⅓ = 3⅚ |
| 9 | fractions | `4/9 * 3/8` |  | `4/9 * 3/8 = 12/72 = 1/6` | ✅ |  | make the 4 and 9 look alike |
| 10 | fractions | `7/10 + 1/5` |  | `7/10 + 1/5 = 7/10 + 2/10 = 8/10` | ❌ | table_slip | make the 7 look like a 1 |
| 11 | linear | `3x + 5 = 20` |  | `3x = 20 + 5` | ❌ | sign_transpose |  |
| 12 | linear | `3x + 5 = 20` |  | `3x = 20 - 5` | ✅ |  |  |
| 13 | linear | `3x + 5 = 20` | `3x = 15` | `x = 5` | ✅ |  |  |
| 14 | linear | `4(m + 6) - 8 = 2m - 4` |  | `4m + 6 - 8 = 2m - 4` | ❌ | distribute_partial |  |
| 15 | linear | `4(m + 6) - 8 = 2m - 4` |  | `4m + 24 - 8 = 2m - 4` | ✅ |  |  |
| 16 | linear | `4(m + 6) - 8 = 2m - 4` | `4m + 16 = 2m - 4` | `2m = -20` | ✅ |  |  |
| 17 | linear | `4(m + 6) - 8 = 2m - 4` | `2m = -20` | `m = 10` | ❌ |  |  |
| 18 | linear | `7y - 9 = 19` |  | `7y = 28` | ✅ |  | make the 7 look like a 1 |
| 19 | linear | `7y - 9 = 19` | `7y = 28` | `y = 4` | ✅ |  | make the 4 look like a 9 |
| 20 | linear | `5a + 3 = 2a + 12` |  | `5a + 2a = 12 - 3` | ❌ | sign_transpose |  |
| 21 | bodmas_decimals | `2 + 3 * 4` |  | `2 + 3 * 4 = 20` | ❌ | bodmas_order |  |
| 22 | bodmas_decimals | `2 + 3 * 4` |  | `2 + 3 * 4 = 14` | ✅ |  |  |
| 23 | bodmas_decimals | `18 / 3 * 2` |  | `18 / 3 * 2 = 3` | ❌ | bodmas_order |  |
| 24 | bodmas_decimals | `18 / 3 * 2` |  | `= 6 * 2 = 12` | ✅ |  |  |
| 25 | bodmas_decimals | `0.5 + 0.25` |  | `0.5 + 0.25 = 0.30` | ❌ | decimal_misaligned |  |
| 26 | bodmas_decimals | `4.5 + 2.35` |  | `4.5 + 2.35 = 2.80` | ❌ | decimal_misaligned |  |
| 27 | bodmas_decimals | `4.5 + 2.35` |  | `4.5 + 2.35 = 6.85` | ✅ |  |  |
| 28 | bodmas_decimals | `7.2 - 1.9` |  | `7.2 - 1.9 = 5.3` | ✅ |  | sloppy 7 and 9 |
| 29 | bodmas_decimals | `(6 + 4) * 3 - 5` |  | `(6 + 4) * 3 - 5 = 25` | ✅ |  |  |
| 30 | bodmas_decimals | `3.6 * 2` |  | `3.6 * 2 = 6.12` | ❌ | carry_forgot |  |
| 31 | lcm_hcf | `lcm(4, 6)` |  | `lcm(4, 6) = 12` | ✅ |  | write it as LCM(4, 6) |
| 32 | lcm_hcf | `lcm(4, 6)` |  | `lcm(4, 6) = 24` | ❌ |  | write it as LCM(4, 6) |
| 33 | lcm_hcf | `hcf(12, 18)` |  | `hcf(12, 18) = 6` | ✅ |  | write it as HCF(12, 18) |
| 34 | lcm_hcf | `hcf(12, 18)` |  | `hcf(12, 18) = 3` | ❌ |  |  |
| 35 | lcm_hcf | `lcm(8, 12)` |  | `lcm(8, 12) = 96` | ❌ |  |  |
| 36 | lcm_hcf | `hcf(24, 36)` |  | `hcf(24, 36) = 12` | ✅ |  |  |
| 37 | lcm_hcf | `lcm(9, 15)` |  | `lcm(9, 15) = 45` | ✅ |  | sloppy 9 and 5 (5 like an S) |
| 38 | lcm_hcf | `hcf(14, 21)` |  | `hcf(14, 21) = 7` | ✅ |  | make the 1s and 7 look alike |
| 39 | lcm_hcf | `lcm(6, 8)` |  | `lcm(6, 8) = 48` | ❌ |  |  |
| 40 | lcm_hcf | `prime factors of 24` |  | `24 = 2 * 2 * 2 * 3` | ✅ |  | write × for * |
| 41 | word_problem | `5 pens cost Rs 60. What do 8 pens cost?` |  | `60 / 5 = 12` | ✅ |  |  |
| 42 | word_problem | `5 pens cost Rs 60. What do 8 pens cost?` |  | `12 * 8 = 96` | ✅ |  |  |
| 43 | word_problem | `5 pens cost Rs 60. What do 8 pens cost?` |  | `60 * 5 = 300` | ❌ |  | wrong setup |
| 44 | word_problem | `Find 20% of Rs 450` |  | `20/100 * 450 = 90` | ✅ |  |  |
| 45 | word_problem | `Find 20% of Rs 450` |  | `20/100 * 450 = 9` | ❌ |  |  |
| 46 | word_problem | `Riya had Rs 500 and spent Rs 235. How much is left?` |  | `500 - 235 = 335` | ❌ | borrow_error |  |
| 47 | word_problem | `Riya had Rs 500 and spent Rs 235. How much is left?` |  | `500 - 235 = 265` | ✅ |  |  |
| 48 | word_problem | `A car goes 60 km in 1 hour. How far in 3.5 hours?` |  | `60 * 3.5 = 210` | ✅ |  |  |

Word problems: the *Question* is the sentence; you only write the arithmetic line.
