// MasterG mark and wordmark. The mark is the maths cube from the landing page, drawn small and
// isometric: a pink top, a yellow face with a red-pen plus, a paper face with a tick, kohl
// outlines and a hard kohl shadow. Used by the landing page, /report, /teacher, /join and /invite.
export function BrandMark({ className = "size-9" }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 40" aria-hidden="true" className={className} style={{ flex: "none", overflow: "visible", filter: "drop-shadow(3px 3px 0 #161513)" }}>
      <path d="M20 3.5 35.5 11.5 20 19.5 4.5 11.5z" fill="#F5B3C1" stroke="#161513" strokeWidth="2.5" strokeLinejoin="round" />
      <path d="M4.5 11.5 20 19.5V36.5L4.5 28.5z" fill="#FFE36E" stroke="#161513" strokeWidth="2.5" strokeLinejoin="round" />
      <path d="M20 19.5 35.5 11.5V28.5L20 36.5z" fill="#FCFBF7" stroke="#161513" strokeWidth="2.5" strokeLinejoin="round" />
      <path d="M8.6 22.4l7.4 3.8M12.3 19.9v8.6" stroke="#C83A22" strokeWidth="2.7" strokeLinecap="round" />
      <path d="M23.6 26.6l2.9 2.3 5.2-6.6" fill="none" stroke="#161513" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// Cube + "MasterG" in the landing's display face.
export function Wordmark({ className = "" }: { className?: string }) {
  return (
    <span className={`flex items-center gap-3 ${className}`}>
      <BrandMark className="size-10" />
      <span style={{ fontWeight: 800, fontSize: "24px", letterSpacing: "-0.01em", whiteSpace: "nowrap" }}>MasterG</span>
    </span>
  );
}
