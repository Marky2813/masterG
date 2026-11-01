"use client";

import type { LandingMotion } from "./motion";

// MasterG's tools: a pinned strip that scrolls sideways on desktop (LandingMotion moves the track)
// and stacks into a column on phones.
const chip = { border: "2px solid var(--color-kohl)", borderRadius: "999px", padding: "5px 12px", fontSize: "13px", fontWeight: 700 } as const;

// Session report + class dashboard (see /report and /teacher). The sheet is an illustration.
function ReportCard() {
  const row = { display: "flex", alignItems: "center", justifyContent: "space-between", gap: "10px", padding: "8px 0", borderBottom: "1.5px dashed #E4DED2" } as const;
  return (
    <article className="strip-card lift" style={{ flex: "none", width: "min(86vw, 640px)", backgroundColor: "var(--color-kohl)", color: "#FFFFFF", border: "3px solid var(--color-kohl)", borderRadius: "28px", boxShadow: "8px 8px 0 var(--color-kohl-ink)", padding: "30px", display: "flex", flexWrap: "wrap", gap: "26px", alignItems: "stretch" }}>
      <div style={{ flex: "1 1 230px", minWidth: 0, display: "flex", flexDirection: "column", gap: "12px" }}>
        <h3 style={{ margin: 0, fontWeight: 800, fontSize: "28px", lineHeight: 1.05, color: "var(--color-peela)" }}>A report for the teacher</h3>
        <p style={{ margin: 0, fontSize: "15px", lineHeight: 1.5, color: "#EAE5DA" }}>
          Every session becomes a report card: each step, the mistake types, the hints needed. Share it as a link or on WhatsApp, or print it.
        </p>
        <p style={{ margin: 0, fontSize: "15px", lineHeight: 1.5, color: "#EAE5DA" }}>
          The teacher&apos;s class dashboard shows the mistakes the whole class shares, and what to reteach.
        </p>
        <div style={{ marginTop: "auto", display: "flex", flexWrap: "wrap", gap: "8px" }}>
          <span style={{ ...chip, borderColor: "#FFFFFF" }}>Share link</span>
          <span style={{ ...chip, borderColor: "#FFFFFF" }}>WhatsApp</span>
          <span style={{ ...chip, borderColor: "#FFFFFF" }}>Print</span>
          <span style={{ ...chip, borderColor: "var(--color-peela)", backgroundColor: "var(--color-peela)", color: "var(--color-kohl)" }}>Class dashboard</span>
        </div>
      </div>
      <div style={{ position: "relative", flex: "1 1 260px", minWidth: 0, backgroundColor: "var(--color-paper)", backgroundImage: "linear-gradient(90deg, transparent 22px, var(--color-margin) 22px, var(--color-margin) 24px, transparent 24px)", color: "var(--color-kohl)", border: "2.5px solid var(--color-kohl)", borderRadius: "10px", padding: "16px 18px 18px 38px", transform: "rotate(1.2deg)", boxShadow: "5px 5px 0 var(--color-peela)" }}>
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: "8px" }}>
          <span style={{ fontSize: "12px", fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--color-muted)" }}>Report card</span>
          <span style={{ fontFamily: "var(--font-hand)", fontSize: "17px", color: "var(--color-pencil)" }}>Today</span>
        </div>
        <div style={{ marginTop: "4px", fontWeight: 800, fontSize: "22px" }}>2/3 + 1/4</div>
        <div style={{ marginTop: "6px", fontSize: "13px", fontWeight: 600 }}>
          <div style={row}>
            <span>Steps</span>
            <span style={{ fontFamily: "var(--font-hand)", fontSize: "18px", fontWeight: 700 }}>
              <span style={{ color: "var(--color-red-pen)" }}>✓</span> 4 &nbsp;<span style={{ color: "var(--color-red-pen)" }}>✗</span> 1
            </span>
          </div>
          <div style={row}>
            <span>Mistake</span>
            <span style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
              <span style={{ fontFamily: "var(--font-hand)", fontSize: "17px", fontWeight: 700 }}>added the denominators</span>
              <span style={{ border: "2px solid var(--color-kohl)", borderRadius: "999px", backgroundColor: "var(--color-rabar)", padding: "0 7px", fontWeight: 800 }}>×2</span>
            </span>
          </div>
          <div style={{ ...row, borderBottom: "none" }}>
            <span>Hints needed</span>
            <span style={{ fontFamily: "var(--font-hand)", fontSize: "18px", fontWeight: 700 }}>1</span>
          </div>
        </div>
        <span aria-hidden="true" style={{ position: "absolute", right: "14px", bottom: "-14px", border: "2.5px solid var(--color-red-pen)", borderRadius: "6px", backgroundColor: "var(--color-paper)", color: "var(--color-red-pen)", padding: "2px 10px", fontWeight: 800, fontSize: "13px", letterSpacing: "0.06em", textTransform: "uppercase", transform: "rotate(-6deg)" }}>Solved</span>
      </div>
    </article>
  );
}

export default function Tools({ motion }: { motion: LandingMotion }) {
  return (
    <section id="features" ref={motion.ref("fSec")} className="grid-bg f-sec" style={{ position: "relative", height: "calc(var(--vh) * 3)" }}>
      <div className="f-pin" ref={motion.ref("fPin")} style={{ position: "sticky", top: "84px", height: "calc(var(--vh) - 84px)", overflow: "hidden", display: "flex", flexDirection: "column", justifyContent: "center" }}>
        <div className="f-track" ref={motion.ref("fTrack")} style={{ display: "flex", alignItems: "stretch", gap: "26px", padding: "14px 40px 22px", willChange: "transform" }}>
          <div style={{ flex: "none", width: "min(86vw, 420px)", display: "flex", flexDirection: "column", justifyContent: "space-between", gap: "28px", padding: "6px 12px 6px 0" }}>
            <h2 className="wt-scroll" style={{ margin: "0", color: "var(--color-kohl)", fontWeight: 800, fontSize: "clamp(34px, 4.6vw, 68px)", lineHeight: 0.95, letterSpacing: "-0.02em", maxWidth: "13ch" }}>MasterG&apos;s tools</h2>
            <p style={{ margin: "0", maxWidth: "40ch", fontSize: "18px", lineHeight: 1.5, color: "#4A463F" }}>What a good tuition teacher does at the notebook: watch every line, mark it in red pen, ask instead of telling. For practice at home, any evening.</p>
            <div className="hide-md" style={{ display: "flex", alignItems: "center", gap: "12px", fontSize: "14px", fontWeight: 700 }}>
              <span style={{ position: "relative", width: "120px", height: "4px", borderRadius: "2px", backgroundColor: "rgba(22,21,19,.12)" }}>
                <span ref={motion.ref("hProg")} style={{ position: "absolute", left: "0", top: "0", height: "4px", width: "100%", borderRadius: "2px", backgroundColor: "var(--color-red-pen)", transformOrigin: "0 50%", transform: "scaleX(0)" }} />
              </span>Keep scrolling
            </div>
          </div>
          {/* A: red pen */}
          <article className="strip-card lift" style={{ flex: "none", width: "min(86vw, 880px)", backgroundColor: "#FFFFFF", border: "3px solid var(--color-kohl)", borderRadius: "28px", boxShadow: "8px 8px 0 var(--color-kohl-ink)", padding: "32px", display: "flex", flexWrap: "wrap", gap: "28px", alignItems: "stretch" }}>
            <div style={{ flex: "1 1 260px", minWidth: "0", display: "flex", flexDirection: "column", gap: "12px" }}>
              <h3 style={{ margin: "0", fontWeight: 800, fontSize: "30px", lineHeight: 1.05 }}>A real red pen</h3>
              <p style={{ margin: "0", fontSize: "16px", lineHeight: 1.55, color: "var(--color-muted)" }}>MasterG marks the notebook the way a teacher does: ticks, crosses, a circle round the wrong step, short notes in the margin. Always handwritten, never typed.</p>
              <div style={{ marginTop: "auto", display: "flex", flexWrap: "wrap", gap: "8px" }}>
                <span style={{ border: "2px solid var(--color-kohl)", borderRadius: "999px", padding: "5px 12px", fontSize: "13px", fontWeight: 700 }}>Tick</span>
                <span style={{ border: "2px solid var(--color-kohl)", borderRadius: "999px", padding: "5px 12px", fontSize: "13px", fontWeight: 700 }}>Cross</span>
                <span style={{ border: "2px solid var(--color-kohl)", borderRadius: "999px", padding: "5px 12px", fontSize: "13px", fontWeight: 700 }}>Circle</span>
                <span style={{ border: "2px solid var(--color-kohl)", borderRadius: "999px", padding: "5px 12px", fontSize: "13px", fontWeight: 700 }}>Margin note</span>
              </div>
            </div>
            <div style={{ flex: "1.3 1 340px", minWidth: "0", backgroundColor: "var(--color-paper)", backgroundImage: "linear-gradient(90deg, transparent 52px, var(--color-margin) 52px, var(--color-margin) 54px, transparent 54px), repeating-linear-gradient(180deg, transparent 0, transparent 47px, #E4DED2 47px, #E4DED2 48px)", border: "2.5px solid var(--color-kohl)", borderRadius: "8px", padding: "0 16px 0 0", fontFamily: "var(--font-hand)", color: "var(--color-pencil)", fontSize: "28px", lineHeight: 1 }}>
              <div style={{ height: "48px", display: "flex", alignItems: "flex-end", position: "relative" }}>
                <span style={{ width: "52px", flex: "none", display: "flex", justifyContent: "center", paddingBottom: "8px" }}>
                  <svg width="30" height="26" viewBox="0 0 34 30" aria-hidden="true">
                    <path className="reveal-draw" pathLength={100} d="M3 16c4 2 7 6 9 10C16 16 23 8 31 3" fill="none" stroke="#C83A22" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </span>
                <span style={{ padding: "0 0 8px 18px" }}>7 × 8 = 56</span>
              </div>
              <div style={{ height: "48px", display: "flex", alignItems: "flex-end", position: "relative" }}>
                <span style={{ width: "52px", flex: "none", display: "flex", justifyContent: "center", paddingBottom: "8px" }}>
                  <svg width="26" height="26" viewBox="0 0 30 30" aria-hidden="true">
                    <path className="reveal-draw" pathLength={100} d="M5 5c7 6 13 13 20 21M25 4C18 11 11 18 4 26" fill="none" stroke="#C83A22" strokeWidth="4" strokeLinecap="round" />
                  </svg>
                </span>
                <span style={{ padding: "0 0 8px 18px" }}>45 + 38 ={" "}
                  <span style={{ position: "relative", display: "inline-block" }}>73
                    <svg viewBox="0 0 120 56" preserveAspectRatio="none" aria-hidden="true" style={{ position: "absolute", left: "-12px", top: "-10px", width: "calc(100% + 24px)", height: "calc(100% + 20px)", overflow: "visible" }}>
                      <path className="reveal-draw" pathLength={100} vectorEffect="non-scaling-stroke" d="M72 6C40 1 8 10 6 28c-2 18 40 25 70 23 28-2 42-13 38-27C110 8 84 1 50 8" fill="none" stroke="#C83A22" strokeWidth="3" strokeLinecap="round" />
                    </svg>
                  </span>
                </span>
              </div>
              <div style={{ height: "48px", display: "flex", alignItems: "flex-end", position: "relative" }}>
                <span style={{ width: "52px", flex: "none", display: "flex", justifyContent: "center", paddingBottom: "8px" }}>
                  <svg width="30" height="26" viewBox="0 0 34 30" aria-hidden="true">
                    <path className="reveal-draw" pathLength={100} d="M3 16c4 2 7 6 9 10C16 16 23 8 31 3" fill="none" stroke="#C83A22" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </span>
                <span style={{ padding: "0 0 8px 18px" }}>1/2 = 2/4</span>
                <span className="bob" style={{ position: "absolute", right: "8px", bottom: "6px", fontWeight: 700, fontSize: "24px", color: "var(--color-red-pen)", transform: "rotate(-6deg)" }}>Well done!</span>
              </div>
              <div style={{ height: "48px", display: "flex", alignItems: "flex-end", position: "relative" }}>
                <span style={{ width: "52px", flex: "none" }} />
                <span style={{ padding: "0 0 8px 18px", position: "relative" }}>x = 4?
                  <svg viewBox="0 0 100 12" preserveAspectRatio="none" aria-hidden="true" style={{ position: "absolute", left: "14px", right: "0", bottom: "0", width: "calc(100% - 14px)", height: "10px" }}>
                    <path className="reveal-draw" pathLength={100} vectorEffect="non-scaling-stroke" d="M2 6c8-6 12 6 20 0s12 6 20 0 12 6 20 0 12 6 20 0 12 6 16 0" fill="none" stroke="#C83A22" strokeWidth="2.5" strokeLinecap="round" />
                  </svg>
                </span>
              </div>
              <div style={{ height: "24px" }} />
            </div>
          </article>
          <ReportCard />
          {/* C: Hinglish voice */}
          <article className="strip-card lift" style={{ flex: "none", width: "min(86vw, 380px)", backgroundColor: "#FFFFFF", border: "3px solid var(--color-kohl)", borderRadius: "28px", boxShadow: "8px 8px 0 var(--color-kohl-ink)", padding: "28px", display: "flex", flexDirection: "column", gap: "12px" }}>
            <h3 style={{ margin: "0", fontWeight: 800, fontSize: "26px", lineHeight: 1.05 }}>Talks the way you do</h3>
            <p style={{ margin: "0", fontSize: "15px", lineHeight: 1.5, color: "var(--color-muted)" }}>Speak the way you do at home. MasterG switches between Hindi and English the way tutors do.</p>
            <div style={{ marginTop: "8px", display: "flex", flexDirection: "column", gap: "8px" }}>
              <div className="reveal" style={{ alignSelf: "flex-end", maxWidth: "85%", backgroundColor: "var(--color-pencil)", color: "#FFFFFF", borderRadius: "16px 16px 4px 16px", padding: "10px 14px", fontSize: "15px", lineHeight: 1.4 }}>MasterG, what&apos;s an LCM?</div>
              <div className="reveal" style={{ alignSelf: "flex-start", maxWidth: "92%", backgroundColor: "var(--color-mist)", border: "2px solid var(--color-kohl)", borderRadius: "16px 16px 16px 4px", padding: "10px 14px", fontSize: "15px", lineHeight: 1.4 }}>
                <span style={{ display: "block", fontWeight: 800, fontSize: "12px", color: "#A8301C" }}>MasterG</span>Least Common Multiple. The smallest number both 3 and 4 divide into. Can you find it?
              </div>
              <div className="reveal" style={{ alignSelf: "flex-end", backgroundColor: "var(--color-pencil)", color: "#FFFFFF", borderRadius: "16px 16px 4px 16px", padding: "10px 14px", fontSize: "15px" }}>12!</div>
            </div>
            <div style={{ marginTop: "auto", paddingTop: "10px", display: "flex", alignItems: "center", gap: "10px" }}>
              <span style={{ width: "40px", height: "40px", borderRadius: "50%", backgroundColor: "var(--color-peela)", border: "2.5px solid var(--color-kohl)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#161513" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <rect x="9" y="3" width="6" height="11" rx="3" />
                  <path d="M5 11a7 7 0 0 0 14 0M12 18v3" />
                </svg>
              </span>
              <span className="wave-dark" style={{ display: "flex", alignItems: "center", gap: "3px" }} aria-hidden="true">
                <span style={{ width: "4px", height: "8px", backgroundColor: "var(--color-kohl)", borderRadius: "2px" }} />
                <span style={{ width: "4px", height: "16px", backgroundColor: "var(--color-kohl)", borderRadius: "2px" }} />
                <span style={{ width: "4px", height: "22px", backgroundColor: "var(--color-kohl)", borderRadius: "2px" }} />
                <span style={{ width: "4px", height: "12px", backgroundColor: "var(--color-kohl)", borderRadius: "2px" }} />
                <span style={{ width: "4px", height: "18px", backgroundColor: "var(--color-kohl)", borderRadius: "2px" }} />
                <span style={{ width: "4px", height: "7px", backgroundColor: "var(--color-kohl)", borderRadius: "2px" }} />
              </span>
              <span style={{ fontSize: "13px", fontWeight: 700 }}>Listening</span>
            </div>
          </article>
          {/* D: speed */}
          <article className="strip-card lift" style={{ flex: "none", width: "min(86vw, 380px)", backgroundColor: "var(--color-rabar)", border: "3px solid var(--color-kohl)", borderRadius: "28px", boxShadow: "8px 8px 0 var(--color-kohl-ink)", padding: "28px", display: "flex", flexDirection: "column", gap: "12px" }}>
            <h3 style={{ margin: "0", fontWeight: 800, fontSize: "26px", lineHeight: 1.05 }}>Quiet when right. Quick when wrong.</h3>
            <p style={{ margin: "0", fontSize: "15px", lineHeight: 1.5 }}>MasterG waits for a pause and checks the maths before speaking, about 2 seconds after the pause. A wrong correction is worse than a slow one.</p>
            <div style={{ marginTop: "auto", paddingTop: "18px" }}>
              <div style={{ position: "relative", height: "4px", backgroundColor: "var(--color-kohl)", borderRadius: "2px", margin: "18px 10px 0" }}>
                <span className="travel" aria-hidden="true" />
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: "-14px" }}>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "8px", width: "33%" }}>
                  <span style={{ width: "24px", height: "24px", borderRadius: "50%", backgroundColor: "#FFFFFF", border: "3px solid var(--color-kohl)" }} />
                  <span style={{ fontSize: "13px", fontWeight: 800, textAlign: "center" }}>You pause</span>
                </div>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "8px", width: "33%" }}>
                  <span style={{ width: "24px", height: "24px", borderRadius: "50%", backgroundColor: "var(--color-peela)", border: "3px solid var(--color-kohl)" }} />
                  <span style={{ fontSize: "13px", fontWeight: 800, textAlign: "center" }}>Maths check</span>
                </div>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "8px", width: "33%" }}>
                  <span style={{ width: "24px", height: "24px", borderRadius: "50%", backgroundColor: "var(--color-red-pen)", border: "3px solid var(--color-kohl)" }} />
                  <span style={{ fontSize: "13px", fontWeight: 800, textAlign: "center" }}>MasterG speaks</span>
                </div>
              </div>
            </div>
          </article>
          {/* E: handwriting */}
          <article className="strip-card lift" style={{ flex: "none", width: "min(86vw, 360px)", backgroundColor: "var(--color-peela)", border: "3px solid var(--color-kohl)", borderRadius: "28px", boxShadow: "8px 8px 0 var(--color-kohl-ink)", padding: "28px", display: "flex", flexDirection: "column", gap: "12px" }}>
            <h3 style={{ margin: "0", fontWeight: 800, fontSize: "26px", lineHeight: 1.05 }}>Reads children&apos;s handwriting</h3>
            <p style={{ margin: "0", fontSize: "15px", lineHeight: 1.5 }}>Reads the steps a child writes by hand. When it isn&apos;t sure what was written, MasterG asks the child to write it again instead of guessing.</p>
            <div style={{ marginTop: "auto", paddingTop: "14px", display: "flex", gap: "10px", alignItems: "center" }}>
              <span style={{ width: "58px", height: "64px", backgroundColor: "var(--color-paper)", border: "2.5px solid var(--color-kohl)", borderRadius: "10px", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "var(--font-hand)", fontSize: "44px", color: "var(--color-pencil)" }}>1</span>
              <span style={{ width: "58px", height: "64px", backgroundColor: "var(--color-paper)", border: "2.5px solid var(--color-kohl)", borderRadius: "10px", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "var(--font-hand)", fontSize: "44px", color: "var(--color-pencil)" }}>7</span>
              <span className="wobble" style={{ width: "58px", height: "64px", backgroundColor: "var(--color-paper)", border: "2.5px dashed var(--color-red-pen)", borderRadius: "10px", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "var(--font-hand)", fontSize: "44px", color: "var(--color-pencil)" }}>4</span>
              <span style={{ fontFamily: "var(--font-hand)", fontWeight: 700, fontSize: "19px", lineHeight: 1.05, color: "var(--color-red-pen)", rotate: "-4deg" }}>Not sure?<br />Write it again.</span>
            </div>
          </article>
          <div aria-hidden="true" style={{ flex: "none", width: "24px" }} />
        </div>
      </div>
    </section>
  );
}
