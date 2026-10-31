import { Gola, Note } from "./Marks";

// The hero's example, drawn the way the app draws it: a fraction sum written on
// ruled paper, the wrong step circled in red, and Masterji's first hint in the
// caption bar. The ink wipes on once when the page opens (motion-safe only).
export default function NotebookSample() {
  return (
    <div
      role="img"
      aria-label="Example notebook page: 3/4 + 1/6 = 4/10, with 4/10 circled in red and the note Kahan gadbad hui. Masterji says: Ye galat hai. Line 1 dobara dekho."
      className="mx-auto w-full max-w-[580px]"
    >
      <div aria-hidden="true" className="rounded-window border-[2.5px] border-kohl bg-paper shadow-hard-xl">
        <div className="flex items-center justify-between gap-3 border-b-[2.5px] border-kohl px-5 py-3">
          <p className="text-sm text-muted">
            Sawaal <span className="font-display font-black text-kohl">3/4 + 1/6</span>
          </p>
          <span className="rounded-full bg-kohl px-3 py-1 text-xs font-semibold text-paper">Watching</span>
        </div>

        <div className="landing-sheet relative h-[272px] md:h-[300px]">
          <span aria-hidden="true" className="absolute inset-y-0 left-[58px] w-px bg-margin" />
          <p className="absolute top-0 right-5 left-[78px] font-hand text-[24px] leading-[44px] text-pencil md:text-[30px]">
            <span className="motion-safe:animate-ink">3/4 + 1/6 = </span>
            <span className="relative inline-block">
              4/10
              <Gola className="absolute -top-2 -left-3 h-[calc(100%+16px)] w-[calc(100%+24px)] text-red-pen" draw="load" delay="1.1s" />
            </span>
          </p>
          <Note className="absolute top-[50px] left-[128px] whitespace-nowrap text-[22px] md:left-[232px] md:text-[24px]" draw="load" delay="1.7s">
            Kahan gadbad hui?
          </Note>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t-[2.5px] border-kohl bg-white px-5 py-3">
          <p className="text-[15px] leading-snug">
            <span className="font-display font-black text-red-pen">Masterji · </span>
            Ye galat hai. Line 1 dobara dekho.
          </p>
          <span className="rounded-full border-2 border-kohl bg-paper px-4 py-1.5 text-xs font-semibold">Hold SPACE to talk</span>
        </div>
      </div>
    </div>
  );
}
