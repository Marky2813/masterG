import { Gola, Note, Tick } from "./Marks";

// Three steps a class goes through. Each card has a small picture of the real
// app: the question box, a line being checked, a circled mistake.
export default function HowItWorks() {
  return (
    <section className="relative rounded-t-[40px] bg-white pt-20 pb-24 md:pt-28 md:pb-32">
      <div className="mx-auto max-w-[1360px] px-4 md:px-10">
        <div className="landing-reveal grid gap-6 md:grid-cols-[1fr_minmax(0,24rem)] md:items-end">
          <h2 className="font-display text-[clamp(40px,5.4vw,72px)] leading-[0.95] font-black text-balance [font-stretch:125%]">
            Ek class aise chalti hai
          </h2>
          <p className="text-base leading-[1.6] text-muted md:text-lg">
            Just like tuition at Masterji’s house. A notebook, a pencil, and a teacher who sees every line you write.
          </p>
        </div>

        <ol className="mt-14 grid gap-6 md:grid-cols-3">
          <li className="landing-reveal flex min-w-0 flex-col rounded-tile border-[2.5px] border-kohl bg-mist p-7 md:p-8">
            <StepNumber n={1} />
            <h3 className="mt-6 font-display text-[26px] leading-[1.1] font-black [font-stretch:112%]">Sawaal likho</h3>
            <p className="mt-3 text-base leading-[1.55] text-muted">
              Type the sum in the question box. Masterji reads it back to check before you start.
            </p>
            <div className="mt-auto pt-9">
              <div className="relative">
                <span aria-hidden="true" className="absolute -top-3 left-1/2 h-4 w-16 -translate-x-1/2 -rotate-2 bg-rabar" />
                <div className="flex items-center gap-2 rounded-control border-[2.5px] border-kohl bg-white py-2.5 pr-2.5 pl-3 shadow-hard-sm">
                  <span className="flex-1 truncate text-[15px] text-muted">Sawaal likho: 3/4 + 1/6</span>
                  <span className="rounded-md bg-kohl px-3 py-1 text-xs font-bold text-paper">Set</span>
                </div>
                <p className="mt-4 text-sm leading-snug">
                  <span className="font-display font-black text-red-pen">Masterji · </span>
                  Toh sawaal hai 3/4 + 1/6. Theek hai?
                </p>
              </div>
            </div>
          </li>

          <li className="landing-reveal flex min-w-0 flex-col rounded-tile border-[2.5px] border-kohl bg-mist p-7 md:p-8">
            <StepNumber n={2} />
            <h3 className="mt-6 font-display text-[26px] leading-[1.1] font-black [font-stretch:112%]">
              Notebook mein solve karo
            </h3>
            <p className="mt-3 text-base leading-[1.55] text-muted">
              Write each line with the stylus. Pause after a line and Masterji checks it. A right step gets a red tick
              and a short word of praise.
            </p>
            <div className="mt-auto pt-9">
              <div className="landing-sheet relative rounded-control border-[2.5px] border-kohl px-4 pt-1 pb-3">
                <p className="font-hand text-[28px] leading-[44px] text-pencil">
                  LCM (3, 4) = 12
                  <span aria-hidden="true" className="ml-1 inline-block h-[26px] w-[2px] align-middle bg-pencil motion-safe:animate-pulse" />
                </p>
                <Tick className="absolute top-2 right-3 size-8" draw="view" />
              </div>
              <span className="mt-4 inline-flex items-center gap-2 rounded-full border-2 border-kohl bg-white px-3 py-1 text-xs font-semibold">
                <svg viewBox="0 0 24 24" aria-hidden="true" className="size-3.5">
                  <path d="M4 12.5l5 5L20 6.5" fill="none" stroke="#C83A22" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                Sahi step
              </span>
            </div>
          </li>

          <li className="landing-reveal flex min-w-0 flex-col rounded-tile border-[2.5px] border-kohl bg-mist p-7 md:p-8">
            <StepNumber n={3} />
            <h3 className="mt-6 font-display text-[26px] leading-[1.1] font-black [font-stretch:112%]">
              Galti pakdi, phir se try
            </h3>
            <p className="mt-3 text-base leading-[1.55] text-muted">
              A red circle on the wrong step. Masterji points first, then asks, and writes the correct step only as the
              last hint.
            </p>
            <div className="mt-auto pt-9">
              <div className="landing-sheet relative rounded-control border-[2.5px] border-kohl px-4 pt-1 pb-3">
                <p className="font-hand text-[28px] leading-[44px] text-pencil">
                  = <span className="relative inline-block">
                    11/24
                    <Gola className="absolute -top-2 -left-3 h-[calc(100%+16px)] w-[calc(100%+24px)]" draw="view" />
                  </span>
                </p>
                <Note className="mt-1 block pl-28 text-[22px]">Kahan gadbad hui?</Note>
              </div>
              <span className="mt-4 inline-flex items-center gap-2 rounded-control border-2 border-kohl bg-red-pen px-4 py-2 text-sm font-bold text-paper shadow-hard-sm">
                <svg viewBox="0 0 24 24" aria-hidden="true" className="size-4">
                  <path
                    d="M4 12a8 8 0 1 0 2.4-5.7M4 4v4h4"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.4"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                Phir se try karo
              </span>
            </div>
          </li>
        </ol>
      </div>
    </section>
  );
}

function StepNumber({ n }: { n: number }) {
  return (
    <span className="flex size-12 items-center justify-center rounded-full border-[2.5px] border-kohl bg-peela font-display text-xl font-black">
      {n}
    </span>
  );
}
