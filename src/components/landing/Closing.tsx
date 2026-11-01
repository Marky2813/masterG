import Link from "next/link";
import { BrandMark } from "./Brand";

// "Open your notebook." The two lines trade weight and width as the section scrolls in (CSS
// scroll timeline, see landing.css), then the footer.
const big = { textDecoration: "none", color: "var(--color-kohl)", border: "3px solid var(--color-kohl)", boxShadow: "5px 5px 0 var(--color-kohl)", borderRadius: "16px", padding: "18px 28px", fontWeight: 800, fontSize: "19px" } as const;
const foot = { color: "#4A463F", fontWeight: 600, textDecoration: "underline", textUnderlineOffset: "3px" } as const;

export default function Closing() {
  return (
    <section id="start" className="grid-bg" style={{ padding: "112px 24px 40px" }}>
      <div style={{ maxWidth: "1360px", margin: "0 auto" }}>
        <h2 className="wt-scroll" style={{ margin: 0, color: "var(--color-kohl)", fontWeight: 800, fontSize: "clamp(44px, 8.4vw, 128px)", lineHeight: 0.88, letterSpacing: "-0.03em" }}>
          <span className="cta-a" style={{ display: "block" }}>
            Open your notebook.
          </span>
          <span className="cta-b" style={{ display: "block" }}>
            Master G is ready.
          </span>
        </h2>
        <div className="reveal" style={{ marginTop: "40px", display: "flex", flexWrap: "wrap", gap: "14px", alignItems: "center" }}>
          <Link className="btn-hard" href="/learn" style={{ ...big, backgroundColor: "var(--color-peela)" }}>
            Start a class
          </Link>
          <Link className="btn-hard" href="/join" prefetch={false} style={{ ...big, backgroundColor: "#FFFFFF" }}>
            Join my class
          </Link>
          <span style={{ color: "#4A463F", fontSize: "16px" }}>Works with a stylus, a tablet pen, or a finger.</span>
        </div>
        <footer style={{ marginTop: "96px", paddingTop: "24px", borderTop: "1.5px solid rgba(22,21,19,.3)", display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: "16px", color: "#4A463F", fontSize: "14px" }}>
          <span style={{ display: "inline-flex", alignItems: "center", gap: "10px", fontWeight: 800, color: "var(--color-kohl)", fontSize: "18px" }}>
            <BrandMark className="size-7" />
            Master G
          </span>
          <nav aria-label="Footer" style={{ display: "flex", flexWrap: "wrap", gap: "18px" }}>
            <Link href="/teacher" prefetch={false} style={foot}>
              I&apos;m a teacher
            </Link>
            <Link href="/join" prefetch={false} style={foot}>
              Join my class
            </Link>
          </nav>
          <span>© 2026 Master G</span>
        </footer>
      </div>
    </section>
  );
}
