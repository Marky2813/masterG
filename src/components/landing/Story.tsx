"use client";

import { memo, type ReactNode } from "react";

// The scroll story: a notebook page that writes one line per scroll step (2/3 + 1/4, a mistake at
// line 4, the fix at line 5), Master G's panel ("Watching quietly" / "Speaking") and a step rail.
// It is an illustration of the product, not a recording.
const RAIL = ["Find the LCM", "Convert 2/3", "Convert 1/4", "Mistake!", "Fixed it"];
const hand = { fontFamily: "var(--font-hand)", fontSize: "30px", lineHeight: 1, color: "var(--color-pencil)" } as const;
const CIRCLE = "M72 6C40 1 8 10 6 28c-2 18 40 25 70 23 28-2 42-13 38-27C110 8 84 1 50 8";
const dot = (bg: string) => <span style={{ width: "12px", height: "12px", borderRadius: "50%", backgroundColor: bg, border: "2px solid var(--color-kohl)" }} />;

function Tick({ d = "M3 16c4 2 7 6 9 10C16 16 23 8 31 3", delay }: { d?: string; delay?: string }) {
  return (
    <svg width="34" height="30" viewBox="0 0 34 30" aria-hidden="true">
      <path className="pen" pathLength={100} d={d} fill="none" stroke="#C83A22" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" style={delay ? { animationDelay: delay } : undefined} />
    </svg>
  );
}

function Line({ mark, children }: { mark?: ReactNode; children?: ReactNode }) {
  return (
    <div style={{ height: "44px", display: "flex", alignItems: "flex-end", position: "relative" }}>
      <div style={{ width: "66px", flex: "none", height: "44px", display: "flex", alignItems: "center", justifyContent: "center" }}>{mark}</div>
      {children}
    </div>
  );
}

const Ink = ({ children }: { children: ReactNode }) => (
  <span className="ink" style={{ ...hand, padding: "0 0 7px 22px" }}>
    {children}
  </span>
);

const Notebook = memo(function Notebook({ s }: { s: number }) {
  return (
    <div className="nb-wrap pe-auto" style={{ position: "relative", marginTop: "14px" }}>
      <div
        role="img"
        aria-label="A notebook page showing the sum two thirds plus one quarter being solved step by step, with Master G's red pen marks"
        style={{ position: "relative", transform: "rotate(-1.4deg)", border: "3px solid var(--color-kohl)", borderRadius: "8px", boxShadow: "12px 12px 0 var(--color-kohl)", backgroundColor: "var(--color-paper)", backgroundImage: "linear-gradient(90deg, transparent 66px, var(--color-margin) 66px, var(--color-margin) 68px, transparent 68px), repeating-linear-gradient(180deg, transparent 0, transparent 43px, #E4DED2 43px, #E4DED2 44px)", padding: "0 20px 0 0", overflow: "visible" }}
      >
        {/* holes */}
        <div style={{ height: "44px", display: "flex", alignItems: "center", justifyContent: "space-around", padding: "0 30px 0 90px" }}>
          {[0, 1, 2, 3, 4].map((i) => (
            <span key={i} style={{ width: "14px", height: "14px", borderRadius: "50%", backgroundColor: "var(--color-kagaz)", border: "2px solid var(--color-kohl)" }} />
          ))}
        </div>
        <div style={{ height: "44px", display: "flex", alignItems: "flex-end", justifyContent: "space-between", padding: "0 0 6px 88px", fontFamily: "var(--font-hand)", color: "var(--color-pencil)" }}>
          <span style={{ fontSize: "22px", fontWeight: 700 }}>Ex 2.3, Q4</span>
          <span style={{ fontSize: "19px" }}>Date: 31/10</span>
        </div>
        <div style={{ ...hand, height: "44px", display: "flex", alignItems: "flex-end", padding: "0 0 6px 88px" }}>
          <span style={{ borderBottom: "2.5px solid var(--color-pencil)", paddingBottom: "1px" }}>Q.  2/3 + 1/4 = ?</span>
        </div>
        <Line mark={s >= 2 && <Tick />}>{s >= 1 && <Ink>LCM (3, 4) = 12</Ink>}</Line>
        <Line mark={s >= 3 && <Tick d="M3 15c4 3 7 6 9 11C17 15 23 8 31 4" />}>{s >= 2 && <Ink>2/3 = 8/12</Ink>}</Line>
        <Line mark={s >= 4 && <Tick d="M3 17c4 2 7 5 9 9C16 16 22 9 31 3" />}>{s >= 3 && <Ink>1/4 = 3/12</Ink>}</Line>
        {/* line 4: the mistake */}
        <Line
          mark={
            s >= 4 && (
              <svg width="30" height="30" viewBox="0 0 30 30" aria-hidden="true">
                <path className="pen" pathLength={100} d="M5 5c7 6 13 13 20 21M25 4C18 11 11 18 4 26" fill="none" stroke="#C83A22" strokeWidth="4" strokeLinecap="round" style={{ animationDelay: ".7s" }} />
              </svg>
            )
          }
        >
          {s >= 4 && (
            <span className="shake">
              <span className="ink" style={{ ...hand, padding: "0 0 7px 22px", opacity: s >= 5 ? 0.55 : 1, textDecoration: s >= 5 ? "line-through" : "none", textDecorationThickness: "2px" }}>
                8/12 + 3/12 ={" "}
                <span style={{ position: "relative", display: "inline-block" }}>
                  11/24
                  {s === 4 && (
                    <svg viewBox="0 0 120 56" preserveAspectRatio="none" aria-hidden="true" style={{ position: "absolute", left: "-14px", top: "-12px", width: "calc(100% + 28px)", height: "calc(100% + 22px)", overflow: "visible" }}>
                      <path className="pen" pathLength={100} vectorEffect="non-scaling-stroke" d={CIRCLE} fill="none" stroke="#C83A22" strokeWidth="3.5" strokeLinecap="round" style={{ animationDelay: "1.1s", animationDuration: ".7s" }} />
                    </svg>
                  )}
                </span>
              </span>
            </span>
          )}
        </Line>
        {/* line 5: fixed */}
        <Line mark={s >= 5 && <Tick delay=".6s" />}>
          {s >= 5 && (
            <>
              <Ink>8/12 + 3/12 = 11/12</Ink>
              <span className="pop" style={{ position: "absolute", right: "14px", top: "-2px", display: "flex", alignItems: "center", gap: "4px", fontFamily: "var(--font-hand)", fontWeight: 700, fontSize: "26px", color: "var(--color-red-pen)", transform: "rotate(-6deg)", animationDelay: ".9s" }}>
                <svg width="26" height="26" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M12 2.5l2.6 6.1 6.6.5-5 4.3 1.6 6.4L12 16.4l-5.8 3.4 1.6-6.4-5-4.3 6.6-.5z" fill="none" stroke="#C83A22" strokeWidth="2" strokeLinejoin="round" />
                </svg>
                Well done!
              </span>
              <span className="burst" aria-hidden="true" style={{ right: "80px", top: "6px" }}>
                {[
                  ["-46px", "-38px", "#FFE36E", "2px"],
                  ["36px", "-44px", "#E58FA3", "2px"],
                  ["58px", "-6px", "#C83A22", "50%"],
                  ["-60px", "4px", "#3A3530", "50%"],
                  ["-20px", "-58px", "#E58FA3", "2px"],
                  ["18px", "-60px", "#FFE36E", "50%"],
                ].map(([x, y, bg, r], i) => (
                  <i key={i} style={{ ["--x" as string]: x, ["--y" as string]: y, backgroundColor: bg, borderRadius: r, animationDelay: ".95s" }} />
                ))}
              </span>
            </>
          )}
        </Line>
        <div style={{ height: "44px" }} />
      </div>
      {/* sticky note: the mistake memory (within the session) */}
      {s >= 4 && (
        <div className="slap" style={{ position: "absolute", right: "18px", top: "-30px", width: "200px", backgroundColor: "var(--color-rabar)", border: "2.5px solid var(--color-kohl)", boxShadow: "5px 5px 0 var(--color-kohl)", borderRadius: "4px", padding: "12px 14px", transform: "rotate(4deg)", zIndex: 2, animationDelay: "1.9s" }}>
          <div style={{ fontFamily: "var(--font-hand)", fontWeight: 700, fontSize: "22px", lineHeight: 1.1 }}>Same mistake again!</div>
          <div style={{ marginTop: "6px", fontSize: "13px", fontWeight: 600, lineHeight: 1.35 }}>Added the denominators. Second time this session.</div>
        </div>
      )}
    </div>
  );
});

const Tutor = memo(function Tutor({ s }: { s: number }) {
  const quiet = s <= 3;
  return (
    <div className="mj-box pe-auto">
      <div className="pop" style={{ backgroundColor: "#FFFFFF", border: "3px solid var(--color-kohl)", borderRadius: "20px", boxShadow: "8px 8px 0 var(--color-kohl)", overflow: "hidden", animationDelay: ".9s" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "10px", padding: "10px 14px", borderBottom: "3px solid var(--color-kohl)", backgroundColor: "var(--color-mist)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "7px" }}>
            {dot("var(--color-red-pen)")}
            {dot("var(--color-peela)")}
            {dot("#E58FA3")}
            <span style={{ marginLeft: "8px", fontWeight: 800, fontSize: "14px" }}>Master G</span>
          </div>
          {quiet ? (
            <span style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12px", fontWeight: 700, color: "#57534C" }}>
              <span style={{ width: "8px", height: "8px", borderRadius: "50%", backgroundColor: "#A29C93" }} />
              Watching quietly
            </span>
          ) : (
            <span style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "12px", fontWeight: 700, color: "#A8301C" }}>
              <span className="wave" aria-hidden="true">
                {[10, 18, 22, 14, 20, 9].map((h, i) => (
                  <i key={i} style={{ height: `${h}px` }} />
                ))}
              </span>
              Speaking
            </span>
          )}
        </div>
        <div style={{ padding: "18px 20px 20px", minHeight: "150px" }} aria-live="polite">
          {quiet && (
            <>
              <p className="rise" style={{ margin: 0, fontSize: "17px", lineHeight: 1.45, color: "#57534C" }}>
                Every line is right so far, so Master G stays quiet and keeps watching.
              </p>
              <p className="rise" style={{ margin: "10px 0 0", fontSize: "13px", color: "#6B665F", animationDelay: ".1s" }}>
                Quiet while you&apos;re right, like a real tutor.
              </p>
            </>
          )}
          {s === 4 && (
            <>
              <p className="pop" style={{ margin: 0, fontWeight: 800, fontSize: "22px", lineHeight: 1.15, color: "var(--color-kohl)", transformOrigin: "left", animationDelay: "1.3s" }}>
                Wait! The same mistake again?
              </p>
              <p className="rise" style={{ margin: "10px 0 0", fontSize: "17px", lineHeight: 1.45, animationDelay: "1.5s" }}>
                Since when do we add the bottom numbers? I won&apos;t tell you the answer. Find where it went wrong.
              </p>
              <p className="rise" style={{ margin: "12px 0 0", fontSize: "13px", color: "#6B665F", animationDelay: "1.65s" }}>
                Speaks about 2 seconds after the pause, once the maths is checked.
              </p>
            </>
          )}
          {s === 5 && (
            <>
              <p className="pop" style={{ margin: 0, fontWeight: 800, fontSize: "22px", lineHeight: 1.15, color: "var(--color-kohl)", transformOrigin: "left", animationDelay: ".8s" }}>
                Yes! That&apos;s right. 11/12.
              </p>
              <p className="rise" style={{ margin: "10px 0 0", fontSize: "17px", lineHeight: 1.45, animationDelay: "1s" }}>
                Well done. Remember this one next time.
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
});

function Bullet({ bg, children, icon }: { bg: string; icon: ReactNode; children: ReactNode }) {
  return (
    <li style={{ display: "flex", alignItems: "center", gap: "12px" }}>
      <span style={{ width: "30px", height: "30px", flex: "none", borderRadius: "50%", backgroundColor: bg, border: "2px solid var(--color-kohl)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: "14px", color: "var(--color-kohl)" }}>{icon}</span>
      {children}
    </li>
  );
}

export default function Story({ step, storyRef, goStep }: { step: number; storyRef: (e: HTMLElement | null) => void; goStep: (n: number) => void }) {
  return (
    <section id="demo" ref={storyRef} className="pe-none" data-step={step} style={{ position: "relative", zIndex: 2, height: "calc(var(--vh) * 2.6)", scrollMarginTop: "84px" }}>
      <div className="story-grid" style={{ position: "sticky", top: "84px", height: "calc(var(--vh) - 84px)", maxWidth: "1360px", margin: "0 auto", padding: "18px 24px 22px", display: "grid", gridTemplateColumns: "repeat(12, minmax(0, 1fr))", columnGap: "28px", rowGap: "16px", alignContent: "center" }}>
        <div className="story-left" style={{ gridColumn: "1 / span 7", minWidth: 0, display: "flex", flexDirection: "column", gap: "22px" }}>
          <div style={{ minWidth: 0 }}>
            <h2 className="wt-scroll" style={{ margin: 0, color: "var(--color-kohl)", fontWeight: 800, fontSize: "clamp(28px, 3.2vw, 48px)", lineHeight: 0.98, letterSpacing: "-0.02em" }}>
              Watch Master G catch a mistake
            </h2>
            <p className="hide-md" style={{ margin: "12px 0 0", maxWidth: "52ch", color: "#4A463F", fontSize: "18px", lineHeight: 1.55 }}>
              Scroll to write each line. Master G stays quiet while the steps are right, and catches the mistake the moment it lands on the page.
            </p>
            <ul className="hide-md" style={{ listStyle: "none", margin: "14px 0 0", padding: 0, display: "flex", flexWrap: "wrap", gap: "8px 22px", color: "var(--color-kohl)", fontSize: "16px", fontWeight: 600 }}>
              <Bullet
                bg="var(--color-rabar)"
                icon={
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#161513" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M4 12l5 5L20 6" />
                  </svg>
                }
              >
                Quiet when it&apos;s right
              </Bullet>
              <Bullet
                bg="var(--color-red-pen)"
                icon={
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="3.2" strokeLinecap="round" aria-hidden="true">
                    <path d="M6 6l12 12M18 6L6 18" />
                  </svg>
                }
              >
                Red pen when it&apos;s wrong
              </Bullet>
              <Bullet bg="var(--color-peela)" icon="2×">
                Repeat a mistake? It remembers within the session
              </Bullet>
            </ul>
          </div>
          <Notebook s={step} />
        </div>
        <div className="story-right" style={{ gridColumn: "9 / span 4", minWidth: 0, display: "flex", flexDirection: "column", gap: "14px" }}>
          <div className="story-spacer" aria-hidden="true" style={{ height: "calc(var(--vh) * .27)" }} />
          <Tutor s={step} />
        </div>
        <ol className="pe-auto" aria-label="Lesson lines" style={{ gridColumn: "1 / -1", listStyle: "none", margin: 0, padding: 0, display: "grid", gridTemplateColumns: "repeat(5, minmax(0, 1fr))", gap: "8px" }}>
          {RAIL.map((label, i) => {
            const n = i + 1;
            const cur = n === step;
            return (
              <li key={label}>
                <button
                  type="button"
                  className="rail-btn"
                  onClick={() => goStep(n)}
                  aria-current={cur ? "step" : undefined}
                  aria-label={`Line ${n}: ${label}`}
                  style={{ width: "100%", minHeight: "50px", textAlign: "left", border: "2.5px solid var(--color-kohl)", borderRadius: "14px", padding: "8px 12px", cursor: "pointer", backgroundColor: cur ? "var(--color-peela)" : "#FFFFFF", color: "var(--color-kohl)", boxShadow: cur ? "4px 4px 0 var(--color-kohl)" : "none", display: "flex", alignItems: "center", gap: "10px" }}
                >
                  <span style={{ flex: "none", width: "28px", height: "28px", borderRadius: "50%", border: "2px solid var(--color-kohl)", backgroundColor: n < step ? "var(--color-rabar)" : cur ? "#FFFFFF" : "var(--color-kagaz)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: "13px" }}>{n}</span>
                  <span className="rail-label" style={{ fontWeight: 700, fontSize: "14px", lineHeight: 1.2 }}>
                    {label}
                  </span>
                </button>
              </li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}
