import { Gola, Note, Tick } from "./Marks";

// The product in six parts: red pen, session memory, voice, timing, handwriting,
// and the rough-work sheet. Each card shows what the app does today.
export default function Features() {
  return (
    <section className="relative bg-kagaz pt-4 pb-24 md:pb-32">
      <div className="mx-auto max-w-[1360px] px-4 md:px-10">
        <div className="landing-reveal grid gap-6 md:grid-cols-[1fr_minmax(0,24rem)] md:items-end">
          <h2 className="font-display text-[clamp(40px,5.4vw,72px)] leading-[0.95] font-black text-balance [font-stretch:125%]">
            Masterji ke paas sab hai
          </h2>
          <p className="text-base leading-[1.6] text-muted md:text-lg">
            The things a good tuition teacher does, on one notebook. Same strictness, same dramatic one-liners.
          </p>
        </div>

        <div className="mt-14 grid gap-6 lg:grid-cols-12">
          {/* Red pen */}
          <article className="landing-reveal flex flex-col gap-8 rounded-tile border-[2.5px] border-kohl bg-white p-7 shadow-hard-lg md:p-10 lg:col-span-7">
            <div className="grid gap-8 md:grid-cols-[1fr_1.1fr] md:items-center">
              <div>
                <h3 className="font-display text-[28px] leading-[1.05] font-black [font-stretch:112%]">Laal pen, bilkul asli</h3>
                <p className="mt-4 text-base leading-[1.6] text-muted">
                  Masterji marks the notebook the way a teacher does: a tick on each right step, a gola round a wrong one,
                  short notes in the margin, and the correct working written out only when you are stuck. Always handwritten, never typed.
                </p>
              </div>
              <div className="landing-sheet relative h-[196px] rounded-control border-[2.5px] border-kohl font-hand text-[24px] text-pencil md:text-[26px]">
                <span aria-hidden="true" className="absolute inset-y-0 left-[46px] w-px bg-margin" />
                <p className="absolute top-0 right-4 left-[64px] h-[46px] leading-[46px]">7 × 8 = 56</p>
                <Tick className="absolute top-[9px] left-[8px] size-7" draw="view" />

                <p className="absolute top-[46px] right-4 left-[64px] h-[46px] leading-[46px]">
                  45 + 38 ={" "}
                  <span className="relative inline-block">
                    73
                    <Gola className="absolute -top-2 -left-3 h-[calc(100%+16px)] w-[calc(100%+24px)]" draw="view" />
                  </span>
                </p>
                <Note className="absolute top-[92px] left-[118px] h-[46px] whitespace-nowrap text-[21px] leading-[46px] md:text-[23px]" draw="view">
                  Carry kahan gaya?
                </Note>

                <p className="absolute top-[138px] right-4 left-[64px] h-[46px] leading-[46px]">1/2 = 2/4</p>
                <Tick className="absolute top-[147px] left-[8px] size-7" draw="view" />
              </div>
            </div>
            <ul className="flex flex-wrap gap-2 text-sm font-semibold">
              {["Tick", "Gola", "Margin note", "Working line"].map((label) => (
                <li key={label} className="rounded-full border-2 border-kohl px-3 py-1">
                  {label}
                </li>
              ))}
            </ul>
          </article>

          {/* Session memory */}
          <article className="landing-reveal flex flex-col rounded-tile border-[2.5px] border-kohl bg-kohl p-7 text-paper shadow-hard-lg md:p-10 lg:col-span-5">
            <h3 className="font-display text-[28px] leading-[1.05] font-black [font-stretch:112%]">Session ki yaad</h3>
            <p className="mt-4 text-base leading-[1.6] text-paper/80">
              Masterji remembers the kind of galti made earlier in this session. When it comes back, he calls it out.
            </p>
            <figure className="mx-auto mt-12 w-full max-w-[300px] -rotate-2 border-[2.5px] border-kohl bg-rabar p-5 text-kohl shadow-hard">
              <blockquote className="font-hand text-[30px] leading-[1.15] font-bold">“Phir se wahi galti?”</blockquote>
              <figcaption className="mt-3 text-sm text-kohl/80">Masterji, jab same galti dobara aaye.</figcaption>
            </figure>
          </article>

          {/* Voice */}
          <article className="landing-reveal flex flex-col rounded-tile border-[2.5px] border-kohl bg-white p-7 shadow-hard-lg lg:col-span-4">
            <h3 className="font-display text-[26px] leading-[1.05] font-black [font-stretch:112%]">Hinglish ya English</h3>
            <p className="mt-4 text-base leading-[1.6] text-muted">
              Pick Hinglish or English, and switch any time. Maths words stay in English, the rest is Hinglish. Hold
              Space to talk, let go, and Masterji answers.
            </p>
            <div className="mt-auto flex flex-col gap-3 rounded-control border-2 border-kohl bg-mist p-4 pt-8">
              <div className="flex items-center justify-between gap-2">
                <span className="rounded-md bg-red-pen px-2 py-0.5 text-xs font-semibold text-paper">Speaking</span>
                <span className="rounded-full border-2 border-kohl px-2.5 py-0.5 text-xs font-semibold">Hinglish</span>
              </div>
              <p className="text-sm leading-snug">
                <span className="font-semibold text-red-pen">Masterji · </span>
                Least Common Multiple, beta. Sabse chhota number jismein 3 aur 4 dono poore jaayein. Tum batao?
              </p>
              <p className="text-sm text-muted">You · 12!</p>
              <p className="pt-1 text-center">
                <span className="inline-block rounded-full border-2 border-kohl bg-paper px-4 py-1.5 text-xs font-semibold">
                  Hold SPACE to talk
                </span>
              </p>
            </div>
          </article>

          {/* Timing */}
          <article className="landing-reveal flex flex-col rounded-tile border-[2.5px] border-kohl bg-rabar p-7 shadow-hard-lg lg:col-span-4">
            <h3 className="font-display text-[26px] leading-[1.05] font-black [font-stretch:112%] text-balance">Pehle check, phir bolta hai</h3>
            <p className="mt-4 text-base leading-[1.6]">
              Masterji waits for your pause, checks the maths, and only then speaks. A wrong correction is worse than a
              slow one.
            </p>
            <div className="relative mt-auto pt-12">
              <span aria-hidden="true" className="absolute top-[55px] right-[16.6%] left-[16.6%] h-[3px] bg-kohl" />
              <ol className="relative grid grid-cols-3 text-center text-sm font-semibold">
                {[
                  { label: "Tum ruke", fill: "bg-paper" },
                  { label: "Maths check", fill: "bg-peela" },
                  { label: "Masterji bole", fill: "bg-red-pen" },
                ].map((node) => (
                  <li key={node.label} className="flex flex-col items-center gap-3">
                    <span className={`size-4 rounded-full border-2 border-kohl ${node.fill}`} />
                    {node.label}
                  </li>
                ))}
              </ol>
            </div>
          </article>

          {/* Handwriting */}
          <article className="landing-reveal flex flex-col rounded-tile border-[2.5px] border-kohl bg-peela p-7 shadow-hard-lg lg:col-span-4">
            <h3 className="font-display text-[26px] leading-[1.05] font-black [font-stretch:112%]">Bachchon ki likhai bhi</h3>
            <p className="mt-4 text-base leading-[1.6]">
              Reads messy digits (1 or 7, 4 or 9) by trying each plausible reading. If any reading makes the step right,
              it counts as right. Red ink only for a clear mistake.
            </p>
            <div className="mt-auto flex items-end gap-3 pt-10">
              {[
                { ch: "1", dashed: false },
                { ch: "7", dashed: false },
                { ch: "4", dashed: true },
              ].map((digit) => (
                <span
                  key={digit.ch}
                  className={`flex size-14 items-center justify-center rounded-control border-[2.5px] border-kohl bg-paper font-hand text-[34px] text-pencil ${digit.dashed ? "border-dashed" : ""}`}
                >
                  {digit.ch}
                </span>
              ))}
              <span className="ml-1 pb-1 text-sm font-semibold">Unsure: no guess, no red mark.</span>
            </div>
          </article>
        </div>

        <p className="landing-reveal mt-8 flex flex-wrap items-center gap-3 text-sm text-muted">
          <span className="rounded-full border-2 border-kohl bg-paper px-3 py-1 font-semibold text-kohl">Rough work</span>
          A pull-out sheet on the right. Whatever you write there is never read, marked or sent anywhere.
        </p>
      </div>
    </section>
  );
}
