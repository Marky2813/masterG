import Link from "next/link";

// The one call to action on the page: it opens the whiteboard app at /learn.
// Solid yellow, kohl outline, hard offset shadow. It lifts on hover and sinks
// into its own shadow when pressed (style guide: "Press: sinks into its shadow").
export default function CtaButton() {
  return (
    <Link
      href="/learn"
      className="group relative inline-flex items-center overflow-hidden rounded-control border-[2.5px] border-kohl bg-peela px-7 py-4 font-display text-lg font-black text-kohl shadow-hard transition-[transform,box-shadow] duration-150 ease-out [font-stretch:112%] hover:-translate-y-0.5 hover:shadow-hard-lg active:translate-x-1.5 active:translate-y-1.5 active:shadow-none focus-visible:outline-3 focus-visible:outline-offset-4 focus-visible:outline-kohl"
    >
      <span className="relative z-10">Class shuru karo</span>
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-0 left-0 w-1/2 -translate-x-full bg-linear-to-r from-transparent via-white/60 to-transparent transition-transform duration-700 ease-out group-hover:translate-x-[200%]"
      />
    </Link>
  );
}
