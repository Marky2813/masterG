// "How a class works": three cards, from the question to the red circle.
export default function HowItWorks() {
  return (
    <section id="how" style={{ backgroundColor: "#FFFFFF", borderRadius: "48px 48px 0 0", padding: "96px 24px 104px" }}>
      <div style={{ maxWidth: "1360px", margin: "0 auto" }}>
        <div className="reveal" style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "flex-end", gap: "24px" }}>
          <h2 className="wt-scroll" style={{ margin: "0", fontWeight: 800, fontSize: "clamp(34px, 4.6vw, 68px)", lineHeight: 0.95, letterSpacing: "-0.02em", maxWidth: "14ch" }}>How a class works</h2>
          <p style={{ margin: "0", maxWidth: "40ch", fontSize: "18px", lineHeight: 1.5, color: "var(--color-muted)" }}>Just like evening tuition: a notebook, a pencil, and MasterG watching every line you write.</p>
        </div>
        <ol style={{ listStyle: "none", margin: "56px 0 0", padding: "0", display: "flex", flexWrap: "wrap", gap: "24px" }}>
          {/* step 1 */}
          <li className="lift-soft reveal" style={{ flex: "1 1 320px", minWidth: "0", backgroundColor: "var(--color-mist)", borderRadius: "28px", padding: "32px", display: "flex", flexDirection: "column", gap: "16px" }}>
            <span className="num" style={{ width: "48px", height: "48px", borderRadius: "50%", backgroundColor: "var(--color-peela)", border: "2.5px solid var(--color-kohl)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: "20px" }}>1</span>
            <h3 style={{ margin: "0", fontWeight: 800, fontSize: "26px", lineHeight: 1.1 }}>Write the question or snap it</h3>
            <p style={{ margin: "0", fontSize: "16px", lineHeight: 1.55, color: "var(--color-muted)" }}>Write the question by hand, or snap the textbook page. MasterG reads it either way.</p>
            <div style={{ marginTop: "auto", paddingTop: "18px", display: "flex", alignItems: "flex-end", gap: "14px", flexWrap: "wrap" }}>
              <div className="float-slow" style={{ position: "relative", backgroundColor: "#FFFFFF", border: "2.5px solid var(--color-kohl)", borderRadius: "10px", padding: "18px 18px 16px", transform: "rotate(-3deg)", boxShadow: "5px 5px 0 var(--color-kohl)", width: "210px" }}>
                <span style={{ position: "absolute", top: "-12px", left: "70px", width: "70px", height: "22px", backgroundColor: "rgba(245,179,193,.9)", border: "1.5px solid var(--color-kohl)", transform: "rotate(4deg)" }} />
                <div style={{ fontSize: "12px", fontWeight: 800, color: "var(--color-muted)" }}>Exercise 2.3</div>
                <div style={{ marginTop: "6px", fontSize: "16px", fontWeight: 700 }}>4. Add: 2/3 + 1/4</div>
                <div style={{ marginTop: "10px", height: "6px", width: "80%", backgroundColor: "#EAE5DA", borderRadius: "3px" }} />
                <div style={{ marginTop: "6px", height: "6px", width: "55%", backgroundColor: "#EAE5DA", borderRadius: "3px" }} />
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                <span style={{ display: "inline-flex", alignItems: "center", gap: "8px", backgroundColor: "var(--color-kohl)", color: "#FFFFFF", borderRadius: "999px", padding: "8px 14px", fontSize: "13px", fontWeight: 700 }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#FFE36E" strokeWidth="2.2" strokeLinejoin="round" aria-hidden="true">
                    <path d="M4 8h3l2-3h6l2 3h3v11H4z" />
                    <circle cx="12" cy="13" r="3.5" />
                  </svg>Snap a photo
                </span>
                <span style={{ display: "inline-flex", alignItems: "center", gap: "8px", backgroundColor: "#FFFFFF", border: "2px solid var(--color-kohl)", borderRadius: "999px", padding: "6px 14px", fontSize: "13px", fontWeight: 700 }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#3A3530" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M4 20l4-1 11-11-3-3L5 16z" />
                  </svg>Or write it
                </span>
              </div>
            </div>
          </li>
          {/* step 2 */}
          <li className="lift-soft reveal" style={{ flex: "1 1 320px", minWidth: "0", backgroundColor: "var(--color-mist)", borderRadius: "28px", padding: "32px", display: "flex", flexDirection: "column", gap: "16px" }}>
            <span className="num" style={{ width: "48px", height: "48px", borderRadius: "50%", backgroundColor: "var(--color-peela)", border: "2.5px solid var(--color-kohl)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: "20px" }}>2</span>
            <h3 style={{ margin: "0", fontWeight: 800, fontSize: "26px", lineHeight: 1.1 }}>Solve it in the notebook</h3>
            <p style={{ margin: "0", fontSize: "16px", lineHeight: 1.55, color: "var(--color-muted)" }}>MasterG follows each line as it&apos;s written. When it&apos;s going right, he stays quiet.</p>
            <div style={{ marginTop: "auto", paddingTop: "18px" }}>
              <div style={{ backgroundColor: "var(--color-paper)", backgroundImage: "repeating-linear-gradient(180deg, transparent 0, transparent 39px, #E4DED2 39px, #E4DED2 40px)", border: "2.5px solid var(--color-kohl)", borderRadius: "10px", height: "84px", padding: "14px 18px", fontFamily: "var(--font-hand)", fontSize: "28px", lineHeight: 1, color: "var(--color-pencil)", display: "flex", alignItems: "flex-start", gap: "4px" }}>LCM (3, 4) = 12
                <span className="blink" style={{ width: "3px", height: "28px", backgroundColor: "var(--color-pencil)", marginLeft: "2px" }} />
              </div>
              <div style={{ marginTop: "12px", display: "inline-flex", alignItems: "center", gap: "8px", backgroundColor: "#FFFFFF", border: "2px solid var(--color-kohl)", borderRadius: "999px", padding: "7px 14px", fontSize: "13px", fontWeight: 700 }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#161513" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" />
                  <circle cx="12" cy="12" r="3" />
                </svg>{" "}MasterG: quiet, all correct
              </div>
            </div>
          </li>
          {/* step 3 */}
          <li className="lift-soft reveal" style={{ flex: "1 1 320px", minWidth: "0", backgroundColor: "var(--color-mist)", borderRadius: "28px", padding: "32px", display: "flex", flexDirection: "column", gap: "16px" }}>
            <span className="num" style={{ width: "48px", height: "48px", borderRadius: "50%", backgroundColor: "var(--color-peela)", border: "2.5px solid var(--color-kohl)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: "20px" }}>3</span>
            <h3 style={{ margin: "0", fontWeight: 800, fontSize: "26px", lineHeight: 1.1 }}>Mistake caught, try again</h3>
            <p style={{ margin: "0", fontSize: "16px", lineHeight: 1.55, color: "var(--color-muted)" }}>A red circle on the wrong step. No answer handed over, just a question: where did it go wrong?</p>
            <div style={{ marginTop: "auto", paddingTop: "18px" }}>
              <div style={{ position: "relative", backgroundColor: "var(--color-paper)", backgroundImage: "repeating-linear-gradient(180deg, transparent 0, transparent 39px, #E4DED2 39px, #E4DED2 40px)", border: "2.5px solid var(--color-kohl)", borderRadius: "10px", height: "84px", padding: "14px 18px", fontFamily: "var(--font-hand)", fontSize: "28px", lineHeight: 1, color: "var(--color-pencil)" }}>={" "}
                <span style={{ position: "relative", display: "inline-block" }}>11/24
                  <svg viewBox="0 0 120 56" preserveAspectRatio="none" aria-hidden="true" style={{ position: "absolute", left: "-12px", top: "-10px", width: "calc(100% + 24px)", height: "calc(100% + 20px)", overflow: "visible" }}>
                    <path className="reveal-draw" pathLength={100} vectorEffect="non-scaling-stroke" d="M72 6C40 1 8 10 6 28c-2 18 40 25 70 23 28-2 42-13 38-27C110 8 84 1 50 8" fill="none" stroke="#C83A22" strokeWidth="3" strokeLinecap="round" />
                  </svg>
                </span>
              </div>
              <div style={{ marginTop: "12px", display: "inline-flex", alignItems: "center", gap: "8px", backgroundColor: "var(--color-red-pen)", color: "#FFFFFF", border: "2px solid var(--color-kohl)", borderRadius: "999px", padding: "7px 14px", fontSize: "13px", fontWeight: 700 }}>
                <svg className="spin-hover" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true">
                  <path d="M3 12a9 9 0 1 0 3-6.7M3 4v5h5" />
                </svg>{" "}Try again
              </div>
            </div>
          </li>
        </ol>
      </div>
    </section>
  );
}
