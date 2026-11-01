import Link from "next/link";
import { Wordmark } from "./Brand";

// Sticky header with a red reading-progress line along its bottom edge (driven by LandingMotion).
const pill = { textDecoration: "none", color: "var(--color-kohl)", border: "1.5px solid rgba(22,21,19,.5)", borderRadius: "999px", padding: "10px 18px", fontSize: "15px", fontWeight: 600 } as const;

export default function Header({ progressRef }: { progressRef: (e: HTMLElement | null) => void }) {
  return (
    <header style={{ position: "sticky", top: 0, zIndex: 40, height: "84px", backgroundColor: "rgba(248,245,238,.86)", backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)", borderBottom: "2px solid var(--color-kohl)" }}>
      <div style={{ position: "relative", maxWidth: "1360px", height: "84px", margin: "0 auto", padding: "0 24px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "16px" }}>
        <a href="#top" aria-label="MasterG home" style={{ textDecoration: "none", color: "var(--color-kohl)" }}>
          <Wordmark />
        </a>
        <nav aria-label="Main" className="hide-sm" style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
          <a className="pill" href="#how" style={pill}>
            How a class works
          </a>
          <a className="pill" href="#features" style={pill}>
            MasterG&apos;s tools
          </a>
        </nav>
        <div style={{ display: "flex", alignItems: "center", gap: "18px" }}>
          <Link href="/teacher" prefetch={false} className="hide-sm" style={{ color: "var(--color-kohl)", fontWeight: 600, fontSize: "15px", textDecoration: "underline", textUnderlineOffset: "3px", whiteSpace: "nowrap" }}>
            I&apos;m a teacher
          </Link>
          <Link className="btn-hard" href="/learn" style={{ textDecoration: "none", backgroundColor: "var(--color-peela)", color: "var(--color-kohl)", border: "2.5px solid var(--color-kohl)", boxShadow: "4px 4px 0 var(--color-kohl)", borderRadius: "14px", padding: "12px 20px", fontWeight: 800, fontSize: "15px", whiteSpace: "nowrap" }}>
            Start a class
          </Link>
        </div>
      </div>
      <span aria-hidden="true" style={{ position: "absolute", left: 0, right: 0, bottom: "-2px", height: "4px" }}>
        <span ref={progressRef} style={{ display: "block", height: "4px", width: "100%", backgroundColor: "var(--color-red-pen)", transformOrigin: "0 50%", transform: "scaleX(0)" }} />
      </span>
    </header>
  );
}
