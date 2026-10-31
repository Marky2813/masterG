import CtaButton from "./CtaButton";
import GlyphField from "./GlyphField";
import NotebookSample from "./NotebookSample";
import { Tick } from "./Marks";

const CHECKS = [
  {
    text: "Sahi ho toh tick, aur ek chhota shabaash",
    icon: (
      <span className="flex size-9 shrink-0 items-center justify-center rounded-full border-2 border-kohl bg-rabar">
        <Tick className="size-5" />
      </span>
    ),
  },
  {
    text: "Galat ho toh laal gola, aur ek ishaara",
    icon: (
      <span className="flex size-9 shrink-0 items-center justify-center rounded-full border-2 border-kohl bg-red-pen">
        <svg viewBox="0 0 24 24" aria-hidden="true" className="size-4">
          <path d="M6 6l12 12M18 6L6 18" fill="none" stroke="#FCFBF7" strokeWidth="3" strokeLinecap="round" />
        </svg>
      </span>
    ),
  },
  {
    text: "Same galti dobara? Is session mein yaad rehti hai",
    icon: (
      <span className="flex size-9 shrink-0 items-center justify-center rounded-full border-2 border-kohl bg-peela font-display text-xs font-black">
        2×
      </span>
    ),
  },
];

export default function Hero() {
  return (
    <section className="relative overflow-hidden">
      <GlyphField />
      <div className="relative mx-auto grid max-w-[1360px] items-center gap-14 px-4 pt-8 pb-20 md:px-10 md:pt-10 md:pb-28 lg:grid-cols-[1.05fr_0.95fr] lg:gap-16 lg:pt-6">
        <div>
          <p className="inline-flex items-center gap-2 rounded-full border-2 border-kohl bg-paper px-4 py-1.5 text-sm font-semibold">
            <span aria-hidden="true" className="size-2.5 rounded-full border border-kohl bg-peela" />
            Class 1–8 maths · Masterji
          </p>

          <h1 className="mt-5 font-display text-[clamp(46px,5.4vw,74px)] leading-[0.92] font-black tracking-[-0.015em] text-balance [font-stretch:125%]">
            Dekho, Masterji kaise pakadte hain
          </h1>

          <p className="mt-6 max-w-xl text-lg leading-[1.55] text-muted md:text-xl">
            A real sum, played live. Masterji checks each line you write, ticks the steps that are right, and
            circles the galti once you pause.
          </p>

          <ul className="mt-6 flex flex-col gap-3">
            {CHECKS.map((item) => (
              <li key={item.text} className="flex items-center gap-4 text-base font-medium md:text-lg">
                {item.icon}
                <span>{item.text}</span>
              </li>
            ))}
          </ul>

          <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-4">
            <CtaButton />
            <p className="max-w-xs text-sm leading-snug text-muted">Stylus ke saath best. Voice ke liye mic chahiye.</p>
          </div>
        </div>

        <NotebookSample />
      </div>
    </section>
  );
}
