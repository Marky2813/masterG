// Two crossed strips of tape with Masterji's catchphrases, scrolling in opposite
// directions. Decorative: hidden from assistive technology. Still when the visitor
// prefers reduced motion (the animation classes are motion-safe only).
const RED = ["Ye galat hai", "Phir se try karo", "Khud dhoondho", "Ab agla line tum karo"];
const YELLOW = ["Phir se wahi galti?", "Dhyan se padho question", "Saaf likho beta", "Shabaash!", "Dekha? Khud pakda!"];

function Run({ items }: { items: string[] }) {
  const set = items.map((text) => (
    <span key={text} className="flex shrink-0 items-center gap-8 pr-8">
      {text}
      <span aria-hidden="true" className="text-[0.8em]">
        ✱
      </span>
    </span>
  ));
  // Two identical copies, so translating by -50% loops without a seam.
  return (
    <div className="flex w-max">
      {set}
      {set}
    </div>
  );
}

export default function Tapes() {
  return (
    <div aria-hidden="true" className="relative h-[170px] overflow-hidden md:h-[210px]">
      <div className="absolute top-1/2 left-[-8%] w-[116%] -translate-y-1/2 rotate-[3.2deg] border-y-[2.5px] border-kohl bg-red-pen py-3 font-display text-[22px] leading-none font-black whitespace-nowrap text-paper [font-stretch:125%] md:text-[30px]">
        <div className="motion-safe:animate-tape-left">
          <Run items={RED} />
        </div>
      </div>
      <div className="absolute top-1/2 left-[-8%] w-[116%] -translate-y-1/2 -rotate-[2.8deg] border-y-[2.5px] border-kohl bg-peela py-3 font-display text-[22px] leading-none font-black whitespace-nowrap text-kohl [font-stretch:125%] md:text-[30px]">
        <div className="motion-safe:animate-tape-right">
          <Run items={YELLOW} />
        </div>
      </div>
    </div>
  );
}
