"use client";

import Link from "next/link";
import { memo } from "react";
import { FACES, glyphsFor, solveHref } from "./faces";

// Hero copy and "Today's question". The section lets pointer events through (pe-none) so the
// cube underneath can be hovered, dragged and tapped; its links and buttons take them back.
const LINES = ["Solve it.", "Master G", "checks every", "step."];
const stretch = (w: number) => Math.round(75 + ((Math.min(800, w) - 250) / 550) * 25);
const eye = (
  <>
    <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" />
    <circle cx="12" cy="12" r="3" />
  </>
);
const smallBtn = { display: "inline-flex", alignItems: "center", gap: "8px", color: "var(--color-kohl)", border: "2.5px solid var(--color-kohl)", boxShadow: "4px 4px 0 var(--color-kohl)", borderRadius: "12px", padding: "10px 16px", fontWeight: 800, fontSize: "14px", textDecoration: "none" } as const;

const Headline = memo(function Headline({ w }: { w: number[] }) {
  return (
    <h1 style={{ margin: 0, color: "var(--color-kohl)", fontWeight: 800, fontSize: "clamp(40px, 6.6vw, 100px)", lineHeight: 0.9, letterSpacing: "-0.035em" }}>
      {LINES.map((l, i) => (
        <span key={l} className="rise h-w" style={{ display: "block", fontWeight: w[i], fontStretch: `${stretch(w[i])}%`, animationDelay: `${0.1 + i * 0.12}s` }}>
          {l}
        </span>
      ))}
    </h1>
  );
});

const QuestionCard = memo(function QuestionCard({ face, roll }: { face: number; roll: () => void }) {
  const f = FACES[face];
  const { glyphs, end } = glyphsFor(f.text);
  return (
    <div
      className="pop q-card pe-auto"
      style={{ position: "relative", zIndex: 3, width: "440px", maxWidth: "100%", transform: "rotate(-1.2deg)", backgroundColor: "var(--color-paper)", backgroundImage: "linear-gradient(90deg, transparent 38px, var(--color-margin) 38px, var(--color-margin) 39.5px, transparent 39.5px)", border: "3px solid var(--color-kohl)", borderRadius: "12px", boxShadow: "8px 8px 0 var(--color-kohl-ink)", padding: "16px 20px 18px 54px", animationDelay: ".9s" }}
    >
      {/* keyed by face so the pen strokes replay on every roll */}
      <div key={face} aria-live="polite" data-testid="todays-question">
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <span className="pop" style={{ width: "36px", height: "36px", flex: "none", borderRadius: "10px", backgroundColor: f.bg, color: f.fg, border: "2.5px solid var(--color-kohl)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: "20px" }}>
            {f.sym}
          </span>
          <span style={{ fontSize: "13px", fontWeight: 800, color: "var(--color-muted)" }}>Today&apos;s question: {f.op}</span>
        </div>
        <div className="q-ink" style={{ position: "relative", marginTop: "10px", height: "68px", display: "flex", alignItems: "flex-end", gap: "1px", padding: "0 0 5px 6px", borderBottom: "1.5px solid #E4DED2", backgroundImage: "linear-gradient(#EFEBE2, #EFEBE2)", backgroundRepeat: "no-repeat", backgroundSize: "100% 1px", backgroundPosition: "0 12px" }}>
          <span className="sr-only">{f.text}</span>
          {glyphs.map((g, i) => (
            <svg key={i} width={g.w} height="48" viewBox={`0 0 ${g.vb} 40`} aria-hidden="true" style={{ flex: "none", overflow: "visible", transform: `translateY(${g.dy}px) rotate(${g.rot}deg) scale(${g.s}) skewX(-6deg)` }}>
              {g.d && (
                <>
                  <path className="pen" pathLength={100} d={g.d} fill="none" stroke="#3A3530" strokeOpacity=".92" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round" style={{ animationDelay: `${g.delay}s`, animationDuration: `${g.dur}s` }} />
                  <path className="pen" pathLength={100} d={g.d} transform="translate(.6 .5)" fill="none" stroke="#3A3530" strokeOpacity=".35" strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round" style={{ animationDelay: `${g.delay}s`, animationDuration: `${g.dur}s` }} />
                </>
              )}
            </svg>
          ))}
          <svg className="pop" width="34" height="34" viewBox="0 0 24 24" aria-hidden="true" style={{ flex: "none", margin: "0 0 8px 8px", animationDelay: `${end}s` }}>
            <path d="M15 5.5l2-2 3.5 3.5-2 2z" fill="#C83A22" stroke="#161513" strokeWidth="1.5" strokeLinejoin="round" />
            <path d="M5.5 15L15 5.5 18.5 9 9 18.5z" fill="#FFE36E" stroke="#161513" strokeWidth="1.5" strokeLinejoin="round" />
            <path d="M3.5 20.5L5.5 15 9 18.5z" fill="#EADCC4" stroke="#161513" strokeWidth="1.5" strokeLinejoin="round" />
            <path d="M3.5 20.5l.7-1.9 1.2 1.2z" fill="#3A3530" />
          </svg>
        </div>
      </div>
      <div style={{ marginTop: "14px", display: "flex", flexWrap: "wrap", gap: "10px" }}>
        <button type="button" className="btn-hard" onClick={roll} style={{ ...smallBtn, backgroundColor: "var(--color-peela)" }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#161513" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true">
            <path d="M3 12a9 9 0 1 0 3-6.7M3 4v5h5" />
          </svg>
          Roll again
        </button>
        <Link className="btn-hard" href={solveHref(f)} style={{ ...smallBtn, backgroundColor: "#FFFFFF" }}>
          Solve it in the notebook
        </Link>
      </div>
    </div>
  );
});

export default function Hero({ w, face, roll }: { w: number[]; face: number; roll: () => void }) {
  return (
    <section className="pe-none hero-sec" style={{ position: "relative", zIndex: 2, minHeight: "calc(var(--vh) - 84px)", display: "flex", flexDirection: "column" }}>
      <div className="hero-grid" style={{ flex: 1, width: "100%", maxWidth: "1360px", margin: "0 auto", padding: "36px 24px 20px", display: "flex", alignItems: "center" }}>
        <div style={{ maxWidth: "660px", minWidth: 0 }}>
          <Headline w={w} />
          <p className="rise" style={{ margin: "36px 0 0", maxWidth: "46ch", color: "#4A463F", fontSize: "20px", lineHeight: 1.5, animationDelay: ".6s" }}>
            Master G watches every line, catches the mistake, and lets your child find the fix on their own.
          </p>
          <div className="rise" style={{ marginTop: "32px", display: "flex", flexWrap: "wrap", gap: "14px", alignItems: "center", animationDelay: ".72s" }}>
            <Link className="btn-hard" href="/learn" style={{ textDecoration: "none", backgroundColor: "var(--color-peela)", color: "var(--color-kohl)", border: "3px solid var(--color-kohl)", boxShadow: "5px 5px 0 var(--color-kohl)", borderRadius: "16px", padding: "18px 28px", fontWeight: 800, fontSize: "19px" }}>
              Start a class
            </Link>
            <a className="pill" href="#demo" style={{ textDecoration: "none", color: "var(--color-kohl)", border: "2px solid var(--color-kohl)", borderRadius: "16px", padding: "16px 24px", fontWeight: 700, fontSize: "17px", display: "inline-flex", alignItems: "center", gap: "10px" }}>
              <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M7 4.5v15l12-7.5z" fill="currentColor" />
              </svg>
              Watch a class
            </a>
          </div>
          <ul className="rise" style={{ listStyle: "none", margin: "44px 0 0", padding: "22px 0 0", borderTop: "1.5px solid rgba(22,21,19,.3)", display: "flex", flexWrap: "wrap", gap: "14px 28px", color: "var(--color-kohl)", fontSize: "15px", fontWeight: 600, animationDelay: ".84s" }}>
            <li style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#161513" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                {eye}
              </svg>
              Every line checked
            </li>
            <li style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#161513" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <rect x="9" y="3" width="6" height="11" rx="3" />
                <path d="M5 11a7 7 0 0 0 14 0M12 18v3" />
              </svg>
              Hindi + English, by voice
            </li>
          </ul>
        </div>
      </div>
      <div className="q-row" style={{ width: "100%", maxWidth: "1360px", margin: "0 auto", padding: "0 24px 28px", display: "flex", justifyContent: "flex-end", alignItems: "flex-end", gap: "24px" }}>
        <QuestionCard face={face} roll={roll} />
      </div>
    </section>
  );
}
