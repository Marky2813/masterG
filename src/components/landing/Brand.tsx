// Master G mark and wordmark. The mark is a yellow notebook tile with Masterji's
// round glasses and a smile, on a hard kohl shadow.
export function BrandMark({ className = "size-9" }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 40" aria-hidden="true" className={className}>
      <rect x="5" y="5" width="32" height="32" rx="10" fill="#161513" />
      <rect x="3" y="3" width="32" height="32" rx="10" fill="#FFE36E" stroke="#161513" strokeWidth="2.5" />
      <circle cx="13.5" cy="16" r="4" fill="none" stroke="#161513" strokeWidth="2.5" />
      <circle cx="22.5" cy="16" r="4" fill="none" stroke="#161513" strokeWidth="2.5" />
      <path d="M12 24c2 2.2 6 2.2 8 0" fill="none" stroke="#161513" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}

export function Wordmark() {
  return (
    <span className="flex items-center gap-3">
      <BrandMark />
      <span className="font-display text-[22px] leading-none font-black tracking-tight [font-stretch:112%]">
        Master G
      </span>
    </span>
  );
}
